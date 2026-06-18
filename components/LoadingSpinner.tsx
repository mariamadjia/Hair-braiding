export default function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-2",
        lg: "h-12 w-12 border-3",
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={`${sizeClasses[size]} animate-spin rounded-full border-neutral-300 border-t-neutral-900`}
                role="status"
                aria-label="Loading"
            >
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    );
}
