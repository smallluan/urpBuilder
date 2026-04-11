import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context';

const AuthPending: React.FC = () => (
	<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#52606d' }}>
		正在校验登录状态...
	</div>
);

interface GuardProps {
	children?: React.ReactNode;
}

export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
	const location = useLocation();
	const { initialized, isAuthenticated } = useAuth();

	if (!initialized) {
		return <AuthPending />;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return children ? <>{children}</> : <Outlet />;
};

export const PublicOnlyRoute: React.FC<GuardProps> = ({ children }) => {
	const { initialized, isAuthenticated } = useAuth();

	if (!initialized) {
		return <AuthPending />;
	}

	if (isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return children ? <>{children}</> : <Outlet />;
};
