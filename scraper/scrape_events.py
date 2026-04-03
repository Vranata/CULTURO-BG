"""Basic event scraper for Culturo BG.

This script fetches an events page, parses event cards with BeautifulSoup,
and stores the results in Supabase with a best-effort deduplication step.

Adapt the CSS selectors at the top of the file to match the target source.
"""

from __future__ import annotations

import argparse
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import requests
from bs4 import BeautifulSoup, Tag
from requests import RequestException
from supabase import Client, create_client


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


EVENT_CARD_SELECTOR = "[data-event-card], .event-card, article.event"
TITLE_SELECTORS = ["[data-event-name]", ".event-title", "h2", "h3"]
ARTIST_SELECTORS = ["[data-event-artist]", ".event-artist", ".artist"]
PLACE_SELECTORS = ["[data-event-place]", ".event-place", ".place"]
CATEGORY_SELECTORS = ["[data-event-category-id]", "[data-event-category]", ".event-category"]
REGION_SELECTORS = ["[data-region-id]", "[data-region]", ".event-region"]
START_DATE_SELECTORS = ["[data-start-date]", "[data-date-start]", ".start-date", "time[datetime]"]
START_TIME_SELECTORS = ["[data-start-hour]", "[data-start-time]", ".start-time", "time"]
END_DATE_SELECTORS = ["[data-end-date]", "[data-date-end]", ".end-date"]
END_TIME_SELECTORS = ["[data-end-hour]", "[data-end-time]", ".end-time"]
DESCRIPTION_SELECTORS = ["[data-event-description]", ".event-description", "p"]
OWNER_SELECTORS = ["[data-user-id]", "[data-owner-id]", "[data-auth-user-id]"]


@dataclass(slots=True)
class EventRecord:
    name_event: str
    name_artist: str
    place_event: str
    id_event_category: int
    id_user: int
    id_region: int
    start_date: str
    start_hour: str
    end_date: str
    end_hour: str
    picture: str | None
    description: str

    def to_payload(self) -> dict[str, Any]:
        return {
            "name_event": self.name_event,
            "name_artist": self.name_artist,
            "place_event": self.place_event,
            "id_event_category": self.id_event_category,
            "id_user": self.id_user,
            "id_region": self.id_region,
            "start_date": self.start_date,
            "start_hour": self.start_hour,
            "end_date": self.end_date,
            "end_hour": self.end_hour,
            "picture": self.picture,
            "description": self.description,
        }


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.split()).strip()


def first_text(card: Tag, selectors: list[str]) -> str:
    for selector in selectors:
        element = card.select_one(selector)
        if element is None:
            continue
        text = clean_text(element.get_text(" ", strip=True))
        if text:
            return text
    return ""


def first_text_or_datetime(card: Tag, selectors: list[str]) -> str:
    for selector in selectors:
        element = card.select_one(selector)
        if element is None:
            continue

        datetime_value = element.get("datetime")
        if datetime_value:
            return clean_text(str(datetime_value))

        text = clean_text(element.get_text(" ", strip=True))
        if text:
            return text

    return ""


def first_attr(card: Tag, attr_names: list[str]) -> str:
    for attr_name in attr_names:
        value = card.get(attr_name)
        if value:
            return clean_text(str(value))
    return ""


def parse_date_value(raw_value: str) -> str:
    raw_value = clean_text(raw_value)
    if not raw_value:
        raise ValueError("Missing date value")

    for date_format in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw_value, date_format).date().isoformat()
        except ValueError:
            continue

    if "T" in raw_value:
        try:
            return datetime.fromisoformat(raw_value.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            pass

    raise ValueError(f"Unsupported date format: {raw_value}")


def parse_time_value(raw_value: str) -> str:
    raw_value = clean_text(raw_value)
    if not raw_value:
        raise ValueError("Missing time value")

    for time_format in ("%H:%M", "%H.%M", "%H:%M:%S"):
        try:
            return datetime.strptime(raw_value, time_format).time().strftime("%H:%M:%S")
        except ValueError:
            continue

    if "T" in raw_value:
        try:
            return datetime.fromisoformat(raw_value.replace("Z", "+00:00")).time().strftime("%H:%M:%S")
        except ValueError:
            pass

    raise ValueError(f"Unsupported time format: {raw_value}")


def normalize_lookup_key(value: str) -> str:
    return clean_text(value).casefold()


def resolve_lookup_id(raw_value: str, lookup_map: dict[str, int], label: str) -> int:
    cleaned_value = clean_text(raw_value)
    if not cleaned_value:
        raise ValueError(f"Missing {label} value")

    if cleaned_value.isdigit():
        return int(cleaned_value)

    matched = lookup_map.get(normalize_lookup_key(cleaned_value))
    if matched is not None:
        return matched

    raise ValueError(f"Unknown {label}: {cleaned_value}")


def resolve_owner_user_id(card: Tag, default_user_id: int | None) -> int:
    raw_value = first_attr(card, OWNER_SELECTORS)
    if raw_value.isdigit():
        return int(raw_value)
    if default_user_id is not None:
        return default_user_id
    raise ValueError("Missing event owner id. Set SCRAPER_DEFAULT_USER_ID or add a data-user-id attribute.")


def load_lookup_maps(client: Client) -> tuple[dict[str, int], dict[str, int]]:
    regions_response = client.table("regions").select("id_region, region").execute()
    categories_response = client.table("event_category").select("id_event_category, name_event_category").execute()

    region_map = {
        normalize_lookup_key(str(row["region"])): int(row["id_region"])
        for row in (regions_response.data or [])
    }
    category_map = {
        normalize_lookup_key(str(row["name_event_category"])): int(row["id_event_category"])
        for row in (categories_response.data or [])
    }
    return region_map, category_map


def parse_event_card(
    card: Tag,
    region_lookup: dict[str, int],
    category_lookup: dict[str, int],
    default_user_id: int | None,
) -> EventRecord:
    name_event = first_attr(card, ["data-event-name"]) or first_text(card, TITLE_SELECTORS)
    name_artist = first_attr(card, ["data-event-artist"]) or first_text(card, ARTIST_SELECTORS)
    place_event = first_attr(card, ["data-event-place"]) or first_text(card, PLACE_SELECTORS)
    category_raw = first_attr(card, ["data-event-category-id", "data-event-category"]) or first_text(card, CATEGORY_SELECTORS)
    region_raw = first_attr(card, ["data-region-id", "data-region"]) or first_text(card, REGION_SELECTORS)

    start_date_raw = first_attr(card, ["data-start-date", "data-date-start"]) or first_text_or_datetime(card, START_DATE_SELECTORS)
    start_time_raw = first_attr(card, ["data-start-hour", "data-start-time"]) or first_text_or_datetime(card, START_TIME_SELECTORS)
    end_date_raw = first_attr(card, ["data-end-date", "data-date-end"]) or first_text_or_datetime(card, END_DATE_SELECTORS)
    end_time_raw = first_attr(card, ["data-end-hour", "data-end-time"]) or first_text_or_datetime(card, END_TIME_SELECTORS)

    description = first_attr(card, ["data-event-description"]) or first_text(card, DESCRIPTION_SELECTORS)
    picture = first_attr(card, ["data-picture"])
    if not picture:
        image = card.select_one("img")
        if image is not None:
            picture = clean_text(image.get("src")) or None

    if not name_event:
        raise ValueError("Missing event name")
    if not name_artist:
        raise ValueError("Missing artist name")
    if not place_event:
        place_event = ""
    if not description:
        description = ""

    return EventRecord(
        name_event=name_event,
        name_artist=name_artist,
        place_event=place_event,
        id_event_category=resolve_lookup_id(category_raw, category_lookup, "event category"),
        id_user=resolve_owner_user_id(card, default_user_id),
        id_region=resolve_lookup_id(region_raw, region_lookup, "region"),
        start_date=parse_date_value(start_date_raw),
        start_hour=parse_time_value(start_time_raw),
        end_date=parse_date_value(end_date_raw),
        end_hour=parse_time_value(end_time_raw),
        picture=picture or None,
        description=description,
    )


def parse_events(
    html: str,
    region_lookup: dict[str, int],
    category_lookup: dict[str, int],
    default_user_id: int | None,
) -> list[EventRecord]:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(EVENT_CARD_SELECTOR)

    records: list[EventRecord] = []
    for index, card in enumerate(cards, start=1):
        if not isinstance(card, Tag):
            continue
        try:
            record = parse_event_card(card, region_lookup, category_lookup, default_user_id)
            records.append(record)
        except ValueError as exc:
            logger.warning("Skipping card %s: %s", index, exc)

    return records


def fetch_html(url: str, timeout_seconds: int = 30) -> str:
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CulturoBG-Scraper/1.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "bg-BG,bg;q=0.9,en;q=0.8",
            },
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        return response.text
    except RequestException as exc:
        logger.error("Failed to fetch %s: %s", url, exc)
        raise


def create_supabase_client() -> Client:
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the scraper."
        )

    return create_client(supabase_url, service_key)


def verify_supabase_connection(client: Client) -> None:
    try:
        client.table("regions").select("id_region").limit(1).execute()
    except Exception as exc:
        raise RuntimeError(f"Could not connect to Supabase: {exc}") from exc


def find_existing_event_id(client: Client, event: EventRecord) -> int | None:
    query = (
        client.table("events")
        .select("id_event")
        .eq("name_event", event.name_event)
        .eq("name_artist", event.name_artist)
        .eq("place_event", event.place_event)
        .eq("id_event_category", event.id_event_category)
        .eq("id_user", event.id_user)
        .eq("id_region", event.id_region)
        .eq("start_date", event.start_date)
        .eq("start_hour", event.start_hour)
        .eq("end_date", event.end_date)
        .eq("end_hour", event.end_hour)
        .limit(1)
    )
    response = query.execute()
    rows = response.data or []
    if not rows:
        return None
    return int(rows[0]["id_event"])


def upsert_event(client: Client, event: EventRecord) -> dict[str, Any]:
    payload = event.to_payload()
    existing_id = find_existing_event_id(client, event)

    try:
        if existing_id is None:
            response = client.table("events").insert(payload).execute()
            logger.info("Inserted event: %s", event.name_event)
        else:
            response = client.table("events").update(payload).eq("id_event", existing_id).execute()
            logger.info("Updated event %s: %s", existing_id, event.name_event)
    except Exception as exc:  # supabase-py raises multiple exception types depending on the failure.
        logger.error("Failed to upsert event '%s': %s", event.name_event, exc)
        raise

    if response.data:
        return response.data[0]
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape events and save them to Supabase.")
    parser.add_argument("--url", default=os.environ.get("SCRAPER_SOURCE_URL"), help="Events page URL")
    parser.add_argument(
        "--default-user-id",
        type=int,
        default=int(os.environ["SCRAPER_DEFAULT_USER_ID"]) if os.environ.get("SCRAPER_DEFAULT_USER_ID") else None,
        help="Fallback id_user for imported events",
    )
    args = parser.parse_args()

    if not args.url:
        raise RuntimeError("Provide --url or set SCRAPER_SOURCE_URL.")

    try:
        client = create_supabase_client()
        verify_supabase_connection(client)
        region_lookup, category_lookup = load_lookup_maps(client)

        html = fetch_html(args.url)
        events = parse_events(html, region_lookup, category_lookup, args.default_user_id)

        if not events:
            logger.warning("No events found on the page.")
            return 0

        processed = 0
        for event in events:
            upsert_event(client, event)
            processed += 1

        logger.info("Processed %s events.", processed)
        return 0
    except Exception as exc:
        logger.error("Scraper failed: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())