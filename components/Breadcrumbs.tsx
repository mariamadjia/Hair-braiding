import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
    label: string;
    href?: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={index} className="flex items-center gap-2">
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="text-neutral-600 hover:text-neutral-900 transition-colors font-light"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className={isLast ? "text-neutral-900 font-medium" : "text-neutral-600 font-light"}>
                                    {item.label}
                                </span>
                            )}
                            {!isLast && <ChevronRight className="h-3 w-3 text-neutral-400" />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
