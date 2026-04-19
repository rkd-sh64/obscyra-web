import Dashboard from '@/components/Dashboard';
import FileReceive from '@/components/FileReceive';
import FileUpload from '@/components/FileUpload';
import Login from '@/components/Login';
import ProtectedRoute from '@/components/ProtectedRoute';
import Register from '@/components/Register';
import { AuthProvider } from '@/context/AuthContext';
import LandingPage from '@/routes/LandingPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />

					{/* Dashboard Route */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>

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
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
