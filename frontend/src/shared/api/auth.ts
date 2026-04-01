import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseClient';

export type AuthCredentials = {
  email: string;
  password: string;
};

export const signUp = async (email: string, password: string): Promise<Session | null> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.session ?? null;
};

export const signIn = async (email: string, password: string): Promise<Session | null> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.session ?? null;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session ?? null;
};