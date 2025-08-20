import Link from 'next/link';

type Props = {
  slug: string;
  title: string;
  excerpt?: string;
};

export function BlogCard({ slug, title, excerpt }: Props) {
  return (
    <div className="rounded border p-4">
      <h3 className="text-xl font-semibold">
        <Link href={`/blog/${slug}`}>{title}</Link>
      </h3>
      {excerpt && <p className="mt-2 text-sm text-muted-foreground">{excerpt}</p>}
    </div>
  );
}
