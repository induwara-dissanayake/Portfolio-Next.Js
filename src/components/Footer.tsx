import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t py-6 text-center text-sm text-gray-500 dark:text-gray-400">
      <Link href="/admin/projects" className="select-none hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
        © 2025
      </Link>
    </footer>
  );
}
