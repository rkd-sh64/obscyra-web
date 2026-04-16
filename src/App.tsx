import FileReceive from '@/components/FileReceive';
import FileUpload from '@/components/FileUpload';
import Login from '@/components/Login';
import Register from '@/components/Register';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/routes/LandingPage';
import ProtectedRoute from '@/components/ProtectedRoute';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />

				{/* Dashboard Route */}
				<Route path="/dashboard" element={<ProtectedRoute>
					<Dashboard />
					</ProtectedRoute>} />

				{/* Share Routes */}
				<Route path="/share">
					<Route index element={<Navigate to="/share/send" replace />} />
					<Route 
					path="send" 
					element={
					<ProtectedRoute>
						<FileUpload />
					</ProtectedRoute>
				} 
				/>
					<Route path="receive" element={<FileReceive />} />
				</Route>
			</Routes>

			<Toaster position="top-right" richColors />
		</BrowserRouter>
	);
}

export default App;
