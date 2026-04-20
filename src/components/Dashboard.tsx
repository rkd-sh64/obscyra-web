import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Package, Inbox, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LayoutHeader from './LayoutHeader';

export default function ShareLanding() {
	

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex items-center justify-center p-6">
			<div className="absolute top-6 right-6 z-20 ">
				<LayoutHeader/>
			</div>
			{/* Top-right logout 
			<div className="absolute top-6 right-6 z-20">
				<Button
					variant="ghost"
					className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm bg-s1/20 border border-s4/25 hover:bg-s1/30 transition-colors cursor-pointer"
					onClick={logout}
					aria-label="Logout"
				>
					<LogOut className="h-4 w-4" />
					<span className="hidden sm:inline">Logout</span>
				</Button>
			</div>*/}

			<div className="absolute inset-0 opacity-20 pointer-events-none ">
				<motion.div
					animate={{ scale: [1, 1.25, 1], opacity: [0.12, 0.32, 0.12] }}
					transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute -left-12 top-1/4 w-[420px] h-[420px] md:w-[520px] md:h-[520px] bg-purple-500/30 rounded-full blur-3xl"
				/>
				<motion.div
					animate={{ scale: [1, 1.25, 1], opacity: [0.12, 0.32, 0.12] }}
					transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
					className="absolute -right-12 bottom-1/4 w-[420px] h-[420px] md:w-[520px] md:h-[520px] bg-blue-500/30 rounded-full blur-3xl"
				/>
			</div>

			<div className="relative z-10 max-w-6xl w-full mt-20">
				<header className="text-center mb-8 px-3">
					<motion.h1
						initial={{ opacity: 0, y: -12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="text-3xl sm:text-4xl md:text-5xl font-bold text-p4 mb-2 leading-tight"
					>
						Share files securely — send or receive
					</motion.h1>
					<p className="text-p4/70 max-w-2xl mx-auto px-2">
						Choose whether you want to send a file or receive one. All transfers are
						encrypted end-to-end and stored temporarily for safe download.
					</p>
				</header>

				<main>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<motion.section
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5 }}
							className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col min-h-[240px]"
						>
							<div className="absolute top-0 left-0 right-0 h-28 md:h-36 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent opacity-40 blur-xl" />

							<div className="relative z-10 flex flex-col h-full">
								<div className="flex items-center gap-3 mb-4">
									<div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-3 rounded-xl">
										<Package className="text-p1" size={22} />
									</div>
									<h2 className="text-lg sm:text-xl font-bold text-p4">
										Send a file
									</h2>
								</div>

								<p className="text-p4/70 mb-6 text-sm sm:text-base">
									Encrypt and upload files — generate a sharing code to give to
									others.
								</p>

								<div className="mt-auto">
									<Link to="/share/send" aria-label="Go to send file page">
										<Button className="w-full py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2">
											<span>Send a file</span>
											<ArrowRight className="h-4 w-4" />
										</Button>
									</Link>
								</div>
							</div>
						</motion.section>

						<motion.section
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col min-h-[240px]"
						>
							<div className="absolute top-0 left-0 right-0 h-28 md:h-36 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent opacity-40 blur-xl" />

							<div className="relative z-10 flex flex-col h-full">
								<div className="flex items-center gap-3 mb-4">
									<div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-3 rounded-xl">
										<Inbox className="text-p1" size={22} />
									</div>
									<h2 className="text-lg sm:text-xl font-bold text-p4">
										Receive a file
									</h2>
								</div>

								<p className="text-p4/70 mb-6 text-sm sm:text-base">
									Enter a sharing code to fetch and decrypt files shared with you.
								</p>

								<div className="mt-auto">
									<Link to="/share/receive" aria-label="Go to receive file page">
										<Button className="w-full py-3 sm:py-4 text-sm sm:text-base border-2 border-s4/25 bg-s1/20 text-p4 rounded-xl hover:bg-s1/40 hover:border-p1/30 transition-all duration-300 font-semibold flex items-center justify-center gap-2">
											<span>Receive a file</span>
											<ArrowRight className="h-4 w-4" />
										</Button>
									</Link>
								</div>
							</div>
						</motion.section>
					</div>

					<div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-p4/60 px-2">
						<div className="flex items-center gap-3">
							<div className="px-3 py-2 bg-s1/20 border border-s4/25 rounded-lg text-xs font-medium">
								End-to-end encrypted
							</div>
							<div className="px-3 py-2 bg-s1/20 border border-s4/25 rounded-lg text-xs font-medium">
								Expires in 1h
							</div>
							<div className="px-3 py-2 bg-s1/20 border border-s4/25 rounded-lg text-xs font-medium">
								Zero-Trust
							</div>
						</div>

						<div className="hidden sm:flex items-center gap-3">
							<span className="h-0.5 w-24 bg-gradient-to-r from-transparent via-p4/30 to-transparent rounded-full" />
							<span className="text-p4/50">Secure • Private • Temporary</span>
							<span className="h-0.5 w-24 bg-gradient-to-r from-transparent via-p4/30 to-transparent rounded-full" />
						</div>

						<div className="sm:hidden text-center w-full">
							<span className="text-p4/50">Secure • Private • Temporary</span>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
