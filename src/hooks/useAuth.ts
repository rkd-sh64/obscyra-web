import { useEffect, useState } from "react";
import axios from "axios";

type User = {
  id: string;
  email: string;
} | null;

export const useAuth = () => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/v1/me`,
          { withCredentials: true }
        );

        if (!cancelled) {
          setUser(response.data); 
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoading };
};