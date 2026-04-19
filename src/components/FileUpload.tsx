import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	encryptFileWithSessionKey,
	generateSessionKey,
	importKey,
	wrapSessionKeyForRecipient,
	base64ToArrayBuffer,
	RSA_ALGORITHM,
} from '@/crypto';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Upload,
	Trash2,
	Copy,
	UserX,
	Share2,
	FileIcon,
	CheckCircle2,
	Link as LinkIcon,
	ChevronLeft,
	CheckCircle,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const FileUpload: React.FC = () => {
	const [files, setFiles] = useState<File[]>([]);
	const [shareCode, setShareCode] = useState<string>('');
	const [recipientPubKey, setRecipientPubKey] = useState<string>('');
	const [shareUrl, setShareUrl] = useState<string>('');
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
	const [isUploading, setIsUploading] = useState<boolean>(false);
	const [totalSize, setTotalSize] = useState<number>(0);
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [uploadComplete, setUploadComplete] = useState<boolean>(false);
	const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
		hours: 1,
		minutes: 0,
		seconds: 0,
	});
	const [receiverMode, setReceiverMode] = useState<'anonymous' | 'verified' | null>(null);
	const [showModeModal, setShowModeModal] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const status = params.get('status');

		if (status === 'success_register') {
			setTimeout(() => {
				toast.success('Successfully Registered!');
			}, 100);
			navigate('/share/send', { replace: true });
		} else if (status === 'success_login') {
			setTimeout(() => {
				toast.success('Successfully Logged-in!');
			}, 100);
			if (location.search.includes('status=')) {
				navigate(location.pathname, { replace: true });
			}
		}
	}, [location.search, navigate]);

	useEffect(() => {
		const size = files.reduce((acc, file) => acc + file.size, 0);
		setTotalSize(size);
	}, [files]);

	// Countdown timer effect
	useEffect(() => {
		if (!uploadComplete) return;

		// Start with 1 hour
		setTimeLeft({ hours: 1, minutes: 0, seconds: 0 });

		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				const { hours, minutes, seconds } = prev;

				if (hours === 0 && minutes === 0 && seconds === 0) {
					clearInterval(timer);
					return { hours: 0, minutes: 0, seconds: 0 };
				}

				if (seconds > 0) {
					return { hours, minutes, seconds: seconds - 1 };
				} else if (minutes > 0) {
					return { hours, minutes: minutes - 1, seconds: 59 };
				} else if (hours > 0) {
					return { hours: hours - 1, minutes: 59, seconds: 59 };
				}

				return prev;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [uploadComplete]);

	const generateQRCode = async (url: string) => {
		try {
			const qrCodeDataUrl = await QRCode.toDataURL(url, {
				width: 256,
				margin: 2,
				color: {
					dark: '#FFFFFF',
					light: '#0F172A',
				},
			});
			setQrCodeUrl(qrCodeDataUrl);
		} catch (error) {
			console.error('Error generating QR code:', error);
		}
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	};

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		if (selectedFiles.length > 0) {
			setFiles((prevFiles) => {
				const newFiles = selectedFiles.filter(
					(file) => !prevFiles.some((f) => f.name === file.name && f.size === file.size)
				);
				return [...newFiles, ...prevFiles]; // New files at the top
			});
		}
		e.target.value = '';
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		// Only set to false if leaving the document
		if (e.currentTarget === e.target) {
			setIsDragging(false);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const droppedFiles = Array.from(e.dataTransfer.files);
		if (droppedFiles.length > 0) {
			setFiles((prevFiles) => {
				const newFiles = droppedFiles.filter(
					(file) => !prevFiles.some((f) => f.name === file.name && f.size === file.size)
				);
				return [...newFiles, ...prevFiles]; // New files at the top
			});
			toast.success(`${droppedFiles.length} file(s) added`);
		}
	};

	const handleRemove = (index: number) => {
		setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
	};

	const handleUpload = async () => {
		try {
			if (!receiverMode) {
				toast.error('Please select receiver mode');
				return;
			}

			if (receiverMode === 'verified' && !recipientPubKey) {
				toast.error('Public key required for verified receiver');
				return;
			}

			if (!files.length) {
				toast.error('No files selected');
				return;
			}

			// Extract public keys for comma separated list
			const recipientPubKeys = recipientPubKey.split(',').map((key) => key.trim()).filter((key) => key.length > 0);
			if (recipientPubKeys.length === 0) {
				toast.error('No recipient public keys provided');
				return;
			}

			const maxUploadSize = 100 << 20; // 100 MB

			if (files.reduce((acc, file) => acc + file.size, 0) > maxUploadSize) {
				toast.error('Total file size exceeds 100MB limit');
				return;
			}

			setIsUploading(true);

			const sessionKey = await generateSessionKey();

			const encryptedFiles = await Promise.all(
				files.map(async (file) => {
					return encryptFileWithSessionKey(file, sessionKey);
				})
			);

			// DIGITAL ENVELOPS: Wrap AES key with recipient's public key
			const wrappedKeys = await Promise.all(
				recipientPubKeys.map(async (pubKey) => {
					const importedPubKey = await importKey(
						base64ToArrayBuffer(pubKey),
						'spki',
						RSA_ALGORITHM,
						true,
						['wrapKey']
					);
					const wrappedKey = await wrapSessionKeyForRecipient(sessionKey, importedPubKey);
					return {
						publicKey: pubKey,
						encryptedKey: wrappedKey,
					};
				})
			);

			// 1. Request presigned URLs
			const payload = encryptedFiles.map((file) => ({
				filename: file.originalName,
				size: file.encryptedBlob.size,
			}));

			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/v1/files/presign`,
				payload,
				{ withCredentials: true }
			);

			const results = res.data?.data; // backend returns array of { filename, uploadURL, key }
			if (!Array.isArray(results.urls)) throw new Error('Invalid response from server');

			for (let i = 0; i < encryptedFiles.length; i++) {
				const file = encryptedFiles[i];

				const { uploadURL } = results.urls[i];
				await axios.put(uploadURL, file.encryptedBlob, {
					headers: {
						'Content-Type': 'application/octet-stream',
					},
				});
			}

			const completeUploadPayload = {
				token: results.token,
				files: results.urls.map(
					(url: { filename: string; uploadURL: string; key: string }, index: number) => ({
						filename: files[index].name,
						size: encryptedFiles[index].encryptedBlob.size,
						key: url.key,
						contentType: files[index].type,
					})
				),
				recipientKeys: wrappedKeys,
			};

			const completeUploadRes = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/v1/files/complete`,
				completeUploadPayload,
				{
					withCredentials: true,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);

			const code = completeUploadRes.data?.data?.share_code;
			const fullUrl = `${window.location.origin}/share/receive?scode=${code}`;

			setShareCode(code);
			setShareUrl(fullUrl);

			await generateQRCode(fullUrl);

			toast.success('Files uploaded successfully');
			setFiles([]);
			setUploadComplete(true);
		} catch (error) {
			console.error(error);
			toast.error('Failed to upload files');
		} finally {
			setIsUploading(false);
		}
	};

	const handleShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: 'Share Files',
					text: `Access my shared files with code: ${shareCode}`,
					url: shareUrl,
				});
			} catch (error) {
				console.error('Error sharing:', error);
			}
		} else {
			navigator.clipboard.writeText(shareUrl);
			toast.success('URL copied to clipboard');
		}
	};

	const handleSendMore = () => {
		setUploadComplete(false);
		setShareCode('');
		setShareUrl('');
		setQrCodeUrl('');
		setTimeLeft({ hours: 1, minutes: 0, seconds: 0 });
	};

	// Format time for display
	const formatTime = (time: number) => {
		return time.toString().padStart(2, '0');
	};

	return (
		<div
			className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Drag and Drop Overlay */}
			<AnimatePresence>
				{isDragging && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
					>
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.8, opacity: 0 }}
							transition={{ type: 'spring', stiffness: 300, damping: 30 }}
							className="text-center"
						>
							<motion.div
								animate={{
									scale: [1, 1.1, 1],
								}}
								transition={{
									duration: 0.5,
									repeat: Infinity,
									ease: 'easeInOut',
								}}
							>
								<Upload className="text-p1 mx-auto mb-6" size={120} />
							</motion.div>
							<h2 className="text-5xl font-bold text-p4 mb-4 max-md:text-4xl max-sm:text-3xl">
								Drop it here!
							</h2>
							<p className="text-p4/70 text-2xl max-md:text-xl max-sm:text-lg">
								Release to upload your files
							</p>
							<motion.div
								className="mt-8 w-96 h-2 bg-s1/30 rounded-full overflow-hidden mx-auto max-sm:w-64"
								initial={{ width: 0 }}
								animate={{ width: '24rem' }}
							>
								<motion.div
									className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
									animate={{
										x: ['-100%', '100%'],
									}}
									transition={{
										duration: 1.5,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
								/>
							</motion.div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Animated background elements */}
			<div className="absolute inset-0 opacity-20">
				<motion.div
					animate={{
						scale: [1, 1.3, 1],
						opacity: [0.2, 0.4, 0.2],
					}}
					transition={{
						duration: 6,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
					className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-3xl max-md:w-[300px] max-md:h-[300px]"
				/>
				<motion.div
					animate={{
						scale: [1, 1.3, 1],
						opacity: [0.2, 0.4, 0.2],
					}}
					transition={{
						duration: 6,
						repeat: Infinity,
						ease: 'easeInOut',
						delay: 3,
					}}
					className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl max-md:w-[300px] max-md:h-[300px]"
				/>
			</div>

			<div className="relative z-10 min-h-screen flex flex-col">
				{/* Breadcrumb */}
				<div className="mb-4 mt-8 mx-4 px-2 max-sm:px-0">
					<Link
						to="/dashboard"
						className="inline-flex items-center gap-2 text-p4/70 hover:text-p4 transition-colors text-sm rounded-md px-2 py-1"
						aria-label="Back to dashboard"
					>
						<ChevronLeft size={16} className="text-p1" />
						<span>Back to dashboard</span>
					</Link>
				</div>
				{/* Header */}
				<motion.header
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="pt-8 pb-6 px-6 text-center max-w-4xl mx-auto w-full"
				>


					<h1 className="text-5xl font-bold mb-3 text-p4 max-md:text-4xl max-sm:text-3xl">
						{uploadComplete ? '' : 'Upload Files'}
					</h1>
					<p className="text-p4/70 text-base max-md:text-sm max-sm:text-xs">
						{uploadComplete
							? ''
							: 'Securely upload and share your files with anyone. Generate instant share links with QR codes for easy access.'}
					</p>
				</motion.header>

				{/* Main Content */}
				<div className="flex-1 flex items-center justify-center px-4 pb-6 max-sm:px-3 max-sm:pb-4">
					<AnimatePresence mode="wait">
						{!uploadComplete ? (
							// Upload Section
							<motion.div
								key="upload-section"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={{ duration: 0.4 }}
								className="w-full max-w-4xl mx-auto"
							>
								<div className="grid lg:grid-cols-2 gap-6 max-lg:grid-cols-1 max-sm:gap-4">
									{/* Left Column - Upload Section */}
									<motion.div
										initial={{ opacity: 0, x: -50 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.6, delay: 0.2 }}
										className="space-y-4 max-sm:space-y-3"
									>
										{/* Upload Card */}
										<div className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-6 max-md:p-5 max-sm:p-4">
											{receiverMode && (
												<div className="mb-3 flex justify-end">
													<span className={`inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-full border text-p4 ${receiverMode === 'verified'
															? 'border-blue-500/40 bg-blue-500/10'
															: 'border-purple-500/40 bg-purple-500/10'
														}`}>
														{receiverMode === 'verified' ? (
															<>
																<CheckCircle className="w-3.5 h-3.5 text-p1" />
																<span>Verified Mode</span>
															</>
														) : (
															<>
																<UserX className="w-3.5 h-3.5 text-p1" />
																<span>Anonymous Mode</span>
															</>
														)}
													</span>
												</div>
											)}
											{/* Gradient overlay */}
											<div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-transparent opacity-50 blur-xl" />

											<div className="relative z-10">
												{/* Upload Area */}
												<div>
													<label
														htmlFor="upload"
														className="flex flex-col items-center justify-center border-2 border-dashed border-s4/25 rounded-2xl py-16 cursor-pointer hover:border-p1/50 hover:bg-s1/30 transition-all duration-300 group max-md:py-12 max-sm:py-8"
													>
														<motion.div
															whileHover={{ scale: 1.1 }}
															transition={{ duration: 0.2 }}
														>
															<Upload
																className="text-p4/60 mb-3 group-hover:text-p1 transition-colors duration-300 max-sm:size-8"
																size={48}
															/>
														</motion.div>
														<p className="text-p4 font-semibold text-xl mb-2 max-sm:text-lg max-sm:text-center">
															Click to upload files
														</p>
														<p className="text-p4/60 text-sm max-sm:text-xs max-sm:text-center">
															or drag and drop your files here
														</p>
														<Input
															id="upload"
															type="file"
															multiple
															className="hidden"
															onChange={handleFile}
														/>
													</label>
												</div>

												{/* File Stats */}
												{files.length > 0 && (
													<motion.div
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														className="mt-4 flex items-center justify-between bg-s1/30 border border-s4/25 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2"
													>
														<div className="flex items-center gap-3 max-sm:gap-2">
															<FileIcon
																className="text-p1 max-sm:size-4"
																size={20}
															/>
															<span className="text-p4 font-semibold text-base max-sm:text-sm">
																{files.length}{' '}
																{files.length === 1
																	? 'file'
																	: 'files'}
															</span>
														</div>
														<span className="text-p4/70 font-medium text-sm max-sm:text-xs">
															{formatFileSize(totalSize)}
														</span>
													</motion.div>
												)}
											</div>
											{receiverMode === 'verified' && (
												<Input
													type="text"
													placeholder="Enter recipient's public key"
													value={recipientPubKey}
													onChange={(e) => setRecipientPubKey(e.target.value)}
													className="mt-4 w-full border-s4/25 rounded-xl py-6 focus:border-p1/50 focus:bg-s1/30 focus:outline-none focus:ring-2 focus:ring-s1/70 transition-all duration-300"
												/>
											)}
										</div>

										{/* Action Buttons */}
										<AnimatePresence>
											{files.length > 0 && (
												<motion.div
													initial={{ opacity: 0, y: 20 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -20 }}
													className="flex gap-3 max-sm:flex-col max-sm:gap-2"
												>
													<Button
														onClick={handleUpload}
														disabled={isUploading || !receiverMode}
														className="flex-1 py-3 text-base bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer max-sm:py-2.5 max-sm:text-sm"
														style={{
															backgroundSize: '200% 100%',
															backgroundPosition: '0% 0%',
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.backgroundPosition =
																'100% 0%';
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.backgroundPosition =
																'0% 0%';
														}}
													>
														{isUploading ? (
															<>
																<Loader2 className="mr-2 h-5 w-5 animate-spin max-sm:size-4" />
																Uploading...
															</>
														) : (
															<>
																<Upload className="mr-2 h-5 w-5 max-sm:size-4" />
																Upload Files
															</>
														)}
													</Button>
													<Button
														onClick={() => setFiles([])}
														className="px-6 py-3 text-base border-2 border-s4/25 bg-s1/20 text-p4 rounded-xl hover:bg-s1/40 hover:border-red-500/30 transition-all duration-300 cursor-pointer max-sm:py-2.5 max-sm:text-sm max-sm:flex-1"
													>
														<Trash2 className="mr-2 h-5 w-5 max-sm:size-4" />
														Clear
													</Button>
												</motion.div>
											)}
										</AnimatePresence>
									</motion.div>

									{/* Right Column - Files List */}
									<motion.div
										initial={{ opacity: 0, x: 50 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.6, delay: 0.3 }}
										className="lg:h-[500px] max-lg:h-[400px] max-sm:h-[300px]"
									>
										<div className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-6 max-md:p-5 max-sm:p-4 h-full flex flex-col">
											{/* Gradient overlay */}
											<div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent opacity-50 blur-xl" />

											<div className="relative z-10 h-full flex flex-col">
												<h2 className="text-xl font-bold text-p4 mb-4 flex items-center gap-2 flex-shrink-0 max-sm:text-lg">
													<FileIcon
														className="text-p1 max-sm:size-5"
														size={24}
													/>
													Selected Files
												</h2>

												{files.length === 0 ? (
													<div className="flex-1 flex flex-col items-center justify-center text-center py-12 max-sm:py-8">
														<FileIcon
															className="text-p4/30 mb-4 max-sm:size-10"
															size={56}
														/>
														<p className="text-p4/60 text-base max-sm:text-sm">
															No files selected yet
														</p>
														<p className="text-p4/40 text-sm mt-2 max-sm:text-xs">
															Upload files to see them here
														</p>
													</div>
												) : (
													<div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar min-h-0">
														{files.map((file, index) => (
															<motion.div
																key={`${file.name}-${index}`}
																initial={{ opacity: 0, x: 20 }}
																animate={{ opacity: 1, x: 0 }}
																exit={{ opacity: 0, x: -20 }}
																transition={{ duration: 0.2 }}
																className="flex items-center justify-between bg-s1/30 border border-s4/25 rounded-xl px-4 py-3 hover:bg-s1/40 hover:border-p1/30 transition-all duration-200 group flex-shrink-0 max-sm:px-3 max-sm:py-2"
															>
																<div className="flex items-center gap-3 flex-1 min-w-0">
																	<div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-2.5 rounded-lg flex-shrink-0 max-sm:p-2">
																		<FileIcon
																			className="text-p1 max-sm:size-4"
																			size={20}
																		/>
																	</div>
																	<div className="flex-1 min-w-0">
																		<p
																			title={file.name}
																			className="text-p4 truncate font-medium text-sm mb-0.5 max-sm:text-xs"
																		>
																			{file.name}
																		</p>
																		<p className="text-p4/60 text-xs max-sm:text-[10px]">
																			{formatFileSize(
																				file.size
																			)}
																		</p>
																	</div>
																</div>
																<Button
																	variant="ghost"
																	size="icon"
																	className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg flex-shrink-0 ml-3 h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity max-sm:h-7 max-sm:w-7 max-sm:ml-2 max-sm:opacity-100"
																	onClick={() =>
																		handleRemove(index)
																	}
																>
																	<Trash2
																		className="text-red-400 max-sm:size-3"
																		size={16}
																	/>
																</Button>
															</motion.div>
														))}
													</div>
												)}
											</div>
										</div>
									</motion.div>
								</div>
							</motion.div>
						) : (
							// Success Section - Fits in 100vh with Send More Files button above
							<motion.div
								key="success-section"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={{ duration: 0.4 }}
								className="w-full max-w-4xl mx-auto h-[calc(100vh-100px)] max-sm:h-[calc(100vh-80px)] flex flex-col"
							>
								<div className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full">
									{/* Success Header */}
									<div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-s4/25 py-6 text-center flex-shrink-0 max-sm:py-4">
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{
												delay: 0.2,
												type: 'spring',
												stiffness: 200,
											}}
										>
											<CheckCircle2
												className="text-green-400 mx-auto mb-3 max-sm:size-10"
												size={48}
											/>
										</motion.div>
										<h2 className="text-3xl font-bold text-p4 mb-2 max-md:text-2xl max-sm:text-xl">
											Files Uploaded Successfully!
										</h2>
										<p className="text-p4/70 text-sm max-sm:text-xs">
											Share this link with anyone to give them access
										</p>
									</div>

									<div className="flex-1 overflow-y-auto p-6 space-y-6 max-sm:p-4 max-sm:space-y-4">
										{/* QR Code and Share Details Grid */}
										<div className="grid lg:grid-cols-2 gap-6 max-lg:grid-cols-1">
											{/* QR Code Section */}
											<div className="flex flex-col items-center space-y-4">
												<div className="bg-white/10 border-2 border-s4/25 rounded-2xl p-6 flex items-center justify-center max-sm:p-4">
													{qrCodeUrl ? (
														<img
															src={qrCodeUrl}
															alt="QR Code"
															className="w-48 h-48 max-sm:w-40 max-sm:h-40 rounded-lg"
														/>
													) : (
														<div className="w-48 h-48 bg-s1/30 rounded-lg flex items-center justify-center max-sm:w-40 max-sm:h-40">
															<Loader2
																className="text-p1 animate-spin"
																size={32}
															/>
														</div>
													)}
												</div>
												<p className="text-p4/70 text-sm text-center max-sm:text-xs">
													Scan QR code to access files
												</p>
												{/* Send More Button - MOVED TO TOP */}
												<div className="flex justify-center">
													<Button
														onClick={handleSendMore}
														className="px-8 py-3 text-base bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer max-sm:px-6 max-sm:py-2.5 max-sm:text-sm"
														style={{
															backgroundSize: '200% 100%',
															backgroundPosition: '0% 0%',
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.backgroundPosition =
																'100% 0%';
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.backgroundPosition =
																'0% 0%';
														}}
													>
														<Upload className="mr-2 h-5 w-5 max-sm:size-4" />
														Send More Files
													</Button>
												</div>
											</div>

											{/* Share Details */}
											<div className="space-y-4">
												{/* Share Code */}
												<div>
													<label className="flex items-center gap-2 text-sm font-semibold text-p4 mb-2 max-sm:text-xs">
														<LinkIcon
															size={16}
															className="text-p1 max-sm:size-4"
														/>
														Share Code
													</label>
													<div className="flex items-center gap-2 w-full">
														<div className="flex-1 flex items-center bg-s1/30 border-2 border-s4/25 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2 min-w-0 overflow-hidden">
															<span className="text-p4 font-mono text-lg truncate font-bold max-sm:text-base w-full">
																{shareCode}
															</span>
														</div>
														<Button
															variant="ghost"
															size="icon"
															className="bg-s1/30 hover:bg-s1/40 border-2 border-s4/25 rounded-xl h-12 w-12 cursor-pointer flex-shrink-0 max-sm:h-10 max-sm:w-10"
															onClick={() => {
																navigator.clipboard.writeText(
																	shareCode
																);
																toast.success('Code copied!');
															}}
														>
															<Copy
																className="text-p1 max-sm:size-4"
																size={18}
															/>
														</Button>
													</div>
												</div>

												{/* Share URL */}
												<div>
													<label className="flex items-center gap-2 text-sm font-semibold text-p4 mb-2 max-sm:text-xs">
														<Share2
															size={16}
															className="text-p1 max-sm:size-4"
														/>
														Share URL
													</label>
													<div className="flex items-center gap-2 w-full">
														<div className="flex-1 flex items-center bg-s1/30 border-2 border-s4/25 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2 min-w-0 overflow-hidden">
															<span className="text-p4 text-sm truncate max-sm:text-xs w-full">
																{shareUrl}
															</span>
														</div>
														<Button
															variant="ghost"
															size="icon"
															className="bg-s1/30 hover:bg-s1/40 border-2 border-s4/25 rounded-xl h-12 w-12 cursor-pointer flex-shrink-0 max-sm:h-10 max-sm:w-10"
															onClick={() => {
																navigator.clipboard.writeText(
																	shareUrl
																);
																toast.success('URL copied!');
															}}
														>
															<Copy
																className="text-p1 max-sm:size-4"
																size={18}
															/>
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border-2 border-p1/30 rounded-xl h-12 w-12 cursor-pointer flex-shrink-0 max-sm:h-10 max-sm:w-10"
															onClick={handleShare}
														>
															<Share2
																className="text-p1 max-sm:size-4"
																size={18}
															/>
														</Button>
													</div>
												</div>

												{/* Countdown Timer */}
												<div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-500/20 rounded-xl p-4 max-sm:p-3">
													<div className="text-center">
														<p className="text-p4 text-base font-semibold mb-3 max-sm:text-sm">
															⏱️ This link expires in:
														</p>
														<div className="flex justify-center items-center gap-3 max-sm:gap-2">
															{/* Hours */}
															<div className="text-center">
																<div className="bg-slate-800/50 border border-orange-500/30 rounded-xl px-3 py-2 min-w-[60px] max-sm:min-w-[50px]">
																	<div className="text-2xl font-bold text-orange-400 font-mono max-sm:text-xl">
																		{formatTime(timeLeft.hours)}
																	</div>
																</div>
																<div className="text-p4/70 text-xs mt-1 max-sm:text-[10px]">
																	Hours
																</div>
															</div>

															{/* Separator */}
															<div className="text-xl font-bold text-orange-400 -mt-3 max-sm:-mt-2">
																:
															</div>

															{/* Minutes */}
															<div className="text-center">
																<div className="bg-slate-800/50 border border-orange-500/30 rounded-xl px-3 py-2 min-w-[60px] max-sm:min-w-[50px]">
																	<div className="text-2xl font-bold text-orange-400 font-mono max-sm:text-xl">
																		{formatTime(
																			timeLeft.minutes
																		)}
																	</div>
																</div>
																<div className="text-p4/70 text-xs mt-1 max-sm:text-[10px]">
																	Minutes
																</div>
															</div>

															{/* Separator */}
															<div className="text-xl font-bold text-orange-400 -mt-3 max-sm:-mt-2">
																:
															</div>

															{/* Seconds */}
															<div className="text-center">
																<div className="bg-slate-800/50 border border-orange-500/30 rounded-xl px-3 py-2 min-w-[60px] max-sm:min-w-[50px]">
																	<div className="text-2xl font-bold text-orange-400 font-mono max-sm:text-xl">
																		{formatTime(
																			timeLeft.seconds
																		)}
																	</div>
																</div>
																<div className="text-p4/70 text-xs mt-1 max-sm:text-[10px]">
																	Seconds
																</div>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
			<AnimatePresence>
				{showModeModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}

						className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4"
					>
						<motion.div
							initial={{ scale: 0.85, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.85, opacity: 0 }}

							transition={{ type: 'spring', stiffness: 260, damping: 20 }}
							className="w-full max-w-md bg-s1 border-2 border-s4/25 rounded-2xl p-6 shadow-2xl"
						>
							<h2 className="text-xl font-bold text-p4 text-center mb-5">
								Select Receiver Mode
							</h2>

							<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
								{/* Anonymous */}
								<div
									onClick={() => setReceiverMode('anonymous')}
									className={`cursor-pointer flex flex-col items-center text-center gap-2 border rounded-xl p-4 transition-all hover:scale-105 ${receiverMode === 'anonymous'
										? 'border-p1 bg-s1/40'
										: 'border-s4/25 hover:bg-s1/30'
										}`}
								>
									<div className="p-3 rounded-xl bg-purple-500/20">
										<UserX className="text-p1" size={22} />
									</div>
									<p className="text-p4 font-semibold text-sm">Anonymous</p>
									<p className="text-p4/60 text-xs">
										Anyone with the link can access
									</p>
								</div>

								{/* Verified */}
								<div
									onClick={() => setReceiverMode('verified')}
									className={`cursor-pointer flex flex-col items-center text-center gap-2 border rounded-xl p-4 transition-all hover:scale-105 ${receiverMode === 'verified'
										? 'border-p1 bg-s1/40'
										: 'border-s4/25 hover:bg-s1/30'
										}`}
								>
									<div className="p-3 rounded-xl bg-blue-500/20">
										<CheckCircle2 className="text-p1" size={22} />
									</div>
									<p className="text-p4 font-semibold text-sm">Verified</p>
									<p className="text-p4/60 text-xs">
										Requires recipient public key
									</p>
								</div>
							</div>

							<Button
								className="cursor-pointer w-full mt-6 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white"
								disabled={!receiverMode}
								onClick={() => setShowModeModal(false)}
							>
								Continue
							</Button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
			<style>{`
				.custom-scrollbar {
					scrollbar-width: thin;
					scrollbar-color: rgba(139, 92, 246, 0.3) rgba(255, 255, 255, 0.05);
					scroll-behavior: smooth;
					-webkit-overflow-scrolling: touch;
				}
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.05);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgba(139, 92, 246, 0.3);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgba(139, 92, 246, 0.5);
				}
			`}</style>
		</div>
	);
};

export default FileUpload;
