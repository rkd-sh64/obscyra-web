import  type {ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';

const PublicRoute = ({children}: {children: ReactNode}) => {
    const {user,isLoading} = useAuth();
    if(isLoading)
        return <Loader />
    if(user)
    {
        return <Navigate to='/dashboard' replace />
    }
    return <>{children}</>
};
export default PublicRoute;