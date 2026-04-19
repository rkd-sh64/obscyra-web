import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
	const { user, isLoading } = useAuth();

	if (isLoading) return <Loader />;

	if (!user) return <Navigate to="/login" replace />;

	return <>{children}</>;
};

export default ProtectedRoute;
