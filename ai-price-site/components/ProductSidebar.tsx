import Link from 'next/link';
import BrandIcon from './BrandIcon';
import type {
  ProductCategory,
  SubscriptionProduct,
} from '../data/ai-pricing';

type ProductSidebarProps = {
  products: SubscriptionProduct[];
  currentSlug: string;
};

const categoryLabels: Record<ProductCategory, string> = {
  ai: 'AI 订阅',
  streaming: '流媒体',
};

const categoryOrder: ProductCategory[] = ['ai', 'streaming'];

export default function ProductSidebar({
  products,
  currentSlug,
}: ProductSidebarProps) {
  const groupedProducts = products.reduce<
    Record<ProductCategory, SubscriptionProduct[]>
  >(
    (acc, product) => {
      acc[product.category].push(product);
      return acc;
    },
    {
      ai: [],
      streaming: [],
    }
  );

  return (
    <aside className="hidden shrink-0 lg:block lg:w-60">
      <div className="sticky top-24 rounded-xl border border-zinc-200 bg-white/75 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          产品总览
        </div>

        <div className="space-y-4">
          {categoryOrder.map((category) => {
            const list = groupedProducts[category];

            if (list.length === 0) {
              return null;
            }

            return (
              <div key={category}>
                <div className="px-2 pb-2 text-xs font-medium text-zinc-400">
                  {categoryLabels[category]}
                </div>

                <div className="space-y-1">
                  {list.map((product) => {
                    const active = product.slug === currentSlug;

                    return (
                      <Link
                        key={product.slug}
                        href={`/zh/ai-pricing/${product.slug}/`}
                        className={`relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:transition-opacity ${
                          active
                            ? 'bg-zinc-50 text-zinc-950 before:bg-lime-500 before:opacity-100 dark:bg-zinc-800/70 dark:text-white'
                            : 'text-zinc-600 before:opacity-0 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                        }`}
                      >
                        <BrandIcon
                          product={product}
                          size="sm"
                          className={
                            active
                              ? 'ring-1 ring-zinc-200 dark:ring-zinc-700'
                              : ''
                          }
                        />

                        <span className="truncate">{product.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
