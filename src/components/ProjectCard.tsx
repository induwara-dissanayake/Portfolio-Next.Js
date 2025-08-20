import Link from 'next/link';

type Props = {
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
};

export function ProjectCard({ title, description, imageUrl, projectUrl }: Props) {
  if (projectUrl) {
    return (
      <Link
        href={projectUrl}
        aria-label={`Open project: ${title}`}
        className="group block relative overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="mb-3 h-40 w-full rounded object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-gray-300">{description}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm text-purple-300">
          Visit project <span aria-hidden>→</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={title} className="mb-3 h-40 w-full rounded object-cover" />
      )}
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-gray-300">{description}</p>
    </div>
  );
}
