import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as LinkScroll } from 'react-scroll';

interface NavLinkProps {
	title: string;
}

const Header = () => {
	const navigate = useNavigate();
	const [hasScrolled, setHasScrolled] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setHasScrolled(window.scrollY > 32);
		};

		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	const NavLink = ({ title }: NavLinkProps) => (
		<LinkScroll
			onClick={() => setIsOpen(false)}
			to={title}
			offset={-100}
			spy
			smooth
			activeClass="nav-active"
			className="base-bold text-p4 uppercase transition-colors duration-500 cursor-pointer hover:text-p1 max-lg:my-4 max-lg:h5"
		>
			{title}
		</LinkScroll>
	);

	return (
		<header
			className={clsx(
				'fixed top-0 left-0 z-50 w-full py-6 transition-all duration-500 max-lg:py-4',
				hasScrolled && 'py-2 bg-black-100 backdrop-blur-[8px]'
			)}
		>
			<div className="container flex h-8 items-center justify-between max-lg:px-5">
				{/* Logo - Left Side */}
				<LinkScroll
					to="hero"
					offset={-250}
					spy
					smooth
					className="cursor-pointer z-2 max-lg:flex-1"
				>
					<img
						src="/images/cdlogo.png"
						width={200}
						height={65}
						alt="logo"
						className="max-lg:w-[115px] md:-ml-4"
					/>
				</LinkScroll>

				{/* Desktop Navigation - Center */}
				<nav className="max-lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
					<ul className="flex items-center gap-6">
						<li className="flex items-center gap-6">
							<NavLink title="how it works" />
							<div className="dot" />
							<NavLink title="features" />
						</li>
						<li className="flex items-center gap-6">
							<div className="dot" />
							<NavLink title="pricing" />
							<div className="dot" />
							<NavLink title="faq" />
						</li>
					</ul>
				</nav>

				{/* Mobile Menu */}
				<div
					className={clsx(
						'w-full max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:w-full max-lg:bg-s2 max-lg:opacity-0 lg:hidden',
						isOpen ? 'max-lg:opacity-100' : 'max-lg:pointer-events-none'
					)}
				>
					<div className="max-lg:relative max-lg:flex max-lg:flex-col max-lg:min-h-screen max-lg:p-6 max-lg:overflow-hidden sidebar-before max-md:px-4">
						<nav className="max-lg:relative max-lg:z-2 max-lg:my-auto">
							<ul className="max-lg:block max-lg:px-12 max-lg:space-y-2">
								<li>
									<NavLink title="how it works" />
								</li>
								<li>
									<NavLink title="features" />
								</li>
								<li>
									<NavLink title="pricing" />
								</li>
								<li>
									<NavLink title="faq" />
								</li>
							</ul>
						</nav>

						{/* Mobile Login Button */}
						<div
							onClick={() => {
								navigate('/login');
							}}
							className="mt-8 px-12"
						>
							<button className="w-full base-bold text-p4 uppercase transition-colors duration-500 hover:text-p1 border-2 border-s4/25 rounded-full py-3 bg-s3/10 backdrop-blur-sm">
								Login
							</button>
						</div>

						<div className="block absolute top-1/2 left-0 w-[960px] h-[380px] translate-x-[-290px] -translate-y-1/2 rotate-90">
							<img
								src="/images/bg-outlines.svg"
								width={960}
								height={380}
								alt="outline"
								className="relative z-2"
							/>
							<img
								src="/images/bg-outlines-fill.png"
								width={960}
								height={380}
								alt="outline"
								className="absolute inset-0 mix-blend-soft-light opacity-5"
							/>
						</div>
					</div>
				</div>

				{/* Desktop Login Button - Right Side */}
				<button
					onClick={() => {
						navigate('/login');
					}}
					className="max-lg:hidden base-bold text-p4 uppercase transition-colors duration-500 hover:text-p1 border-2 border-s4/25 rounded-full px-6 py-2 bg-s3/10 backdrop-blur-sm hover:bg-p1/10 z-2"
				>
					Login
				</button>

				{/* Mobile Menu Toggle */}
				<button
					className="lg:hidden z-2 size-10 border-2 border-s4/25 rounded-full flex justify-center items-center ml-4"
					onClick={() => setIsOpen((prevState) => !prevState)}
				>
					<img
						src={`/images/${isOpen ? 'close' : 'magic'}.svg`}
						alt="magic"
						className="size-1/2 object-contain"
					/>
				</button>
			</div>
		</header>
	);
};

export default Header;
