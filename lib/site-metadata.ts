import type { Metadata } from "next";

export function pageMetadata(title: string, description: string, path: string, image = "/social/ah-braiding-cover.jpg"): Metadata {
    const socialTitle = `${title} | AH Braiding`;
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
            title: socialTitle,
            description,
            url: path,
            siteName: "AH Braiding",
            type: "website",
            images: [{ url: image, width: 1200, height: 630, alt: `${title} at AH Braiding` }],
        },
        twitter: {
            card: "summary_large_image",
            title: socialTitle,
            description,
            images: [image],
        },
    };
}
