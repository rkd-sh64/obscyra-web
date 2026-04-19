import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';

type User = {
	id: string;
	email: string;
	username: string;
} | null;

const AuthContext = createContext<{
	user: User;
	isLoading: boolean;
	setUser: React.Dispatch<React.SetStateAction<User>>;
}>({ user: null, isLoading: true, setUser: () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		axios
			.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/me`, {
				withCredentials: true,
				signal: controller.signal,
			})
			.then((res) => setUser(res.data.data))
			.catch((err) => {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setUser(null);
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			});

		return () => controller.abort();
	}, []);

	return (
		<AuthContext.Provider value={{ user, isLoading, setUser }}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
