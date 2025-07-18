/*
  # Fix Profiles INSERT Policy

  1. Security Changes
    - Add INSERT policy for authenticated users to create their own profiles
    - Ensures users can only create profiles for their own user ID (auth.uid() = id)
    - Maintains security while allowing profile creation fallback to work

  2. Policy Details
    - Policy name: "Users can insert own profile"
    - Target: INSERT operations on profiles table
    - Role: authenticated users
    - Check: auth.uid() = id (users can only create their own profile)
*/

-- Add INSERT policy for authenticated users to create their own profiles
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);