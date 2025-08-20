"use client";
import { motion } from 'framer-motion';
import { Github, Linkedin, Facebook } from 'lucide-react';

type Props = {
	github?: string;
	linkedin?: string;
	facebook?: string;
	size?: number;
};

export default function SocialLinks({ github, linkedin, facebook, size = 12 }: Props) {
	// Allow env-based configuration
	github = github || process.env.NEXT_PUBLIC_GITHUB_URL;
	linkedin = linkedin || process.env.NEXT_PUBLIC_LINKEDIN_URL;
	facebook = facebook || process.env.NEXT_PUBLIC_FACEBOOK_URL;
		const items = [
			{ label: 'GitHub', href: github, Icon: Github },
			{ label: 'LinkedIn', href: linkedin, Icon: Linkedin },
			{ label: 'Facebook', href: facebook, Icon: Facebook },
		].filter((i) => !!i.href) as { label: string; href: string; Icon: React.ComponentType<{ size?: number; className?: string }>}[];

	if (!items.length) return null;

		const sizeClass = size === 10 ? 'w-10 h-10' : size === 14 ? 'w-14 h-14' : 'w-12 h-12';
		return (
			<div className="flex gap-4">
			  {items.map((s, index) => (
				<motion.a
					key={s.label}
					href={s.href}
					target="_blank"
					rel="noopener noreferrer"
						className={`${sizeClass} rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-purple-500/20 transition-colors`}
					whileHover={{ scale: 1.1, y: -2 }}
					whileTap={{ scale: 0.95 }}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
					aria-label={s.label}
				>
				  <s.Icon size={20} className="text-purple-300" />
				</motion.a>
			))}
		</div>
	);
}
