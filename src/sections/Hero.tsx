import Button from '@/components/Button.js';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Element } from 'react-scroll';

const Hero = () => {
	const navigate = useNavigate();

	return (
		<section className="relative pt-52 pb-40 max-lg:pt-52 max-lg:pb-36 max-md:pt-36 max-md:pb-32 overflow-hidden">
			<Element name="hero">
				<div className="container">
					<div className="relative z-2 max-w-[750px] max-lg:max-w-388">
						{/* Caption */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, ease: 'easeOut' }}
							className="caption small-2 uppercase text-p3"
						>
							Secure File Sharing
						</motion.div>

						{/* Heading */}
						<motion.h1
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
							className="mb-6 h2 text-p4 uppercase max-lg:mb-7 max-lg:h2 max-md:mb-4 max-md:text-5xl max-md:leading-12"
						>
							Share Smart. <span className="block text-p3">Share Safe.</span>
						</motion.h1>

						{/* Description */}
						<motion.p
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
							className="max-w-440 mb-14 body-1 max-md:mb-10"
						>
							We built <b>Obscyra</b> to make file transfer fast, encrypted, and
							effortless — all right from your browser.
						</motion.p>

						{/* Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
							className="flex items-center gap-4 flex-wrap"
						>
							{/* Primary Button */}
							<Button
								containerClassName="cursor-pointer"
								icon="/images/zap.svg"
								onClick={() => navigate('/share/send')}
							>
								Send a File Now
							</Button>

							{/* Secondary Button (Outlined Style) */}
							<Button
								containerClassName="cursor-pointer border border-s4/25 bg-transparent hover:bg-s1/30 text-p4"
								icon="/images/zap.svg"
								onClick={() => navigate('/share/receive')}
							>
								Receive a File
							</Button>
						</motion.div>
					</div>

					{/* Hero Image */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9, x: 50 }}
						animate={{ opacity: 1, scale: 1, x: 0 }}
						transition={{
							duration: 1,
							delay: 0.4,
							ease: [0.22, 1, 0.36, 1],
						}}
						className="absolute top-[12rem] left-[50rem] w-[600px] pointer-events-none hero-img_res"
					>
						<motion.img
							animate={{ y: [0, -15, 0] }}
							transition={{
								duration: 4,
								repeat: Infinity,
								ease: 'easeInOut',
							}}
							src="/images/iconlogo.png"
							className="size-[475px] max-lg:h-auto"
							alt="Obscyra hero"
						/>
					</motion.div>

					{/* Background Glow */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 0.4 }}
						transition={{ duration: 1.5, delay: 0.5 }}
						className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-p3/20 to-transparent blur-3xl pointer-events-none"
					/>
				</div>
			</Element>
		</section>
	);
};

export default Hero;