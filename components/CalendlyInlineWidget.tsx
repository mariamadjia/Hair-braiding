"use client";

import { useEffect, useRef } from "react";

type CalendlyInlineWidgetProps = {
    url: string;
    className?: string;
    minHeight?: number;
    refreshToken?: string;
};

const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

export default function CalendlyInlineWidget({ url, className, minHeight = 680, refreshToken }: CalendlyInlineWidgetProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const existingScript = document.querySelector<HTMLScriptElement>("script[data-calendly-script='true']");

        const handleScriptLoad = () => {
            (window as typeof window & { Calendly?: { initInlineWidgets?: () => void } }).Calendly?.initInlineWidgets?.();
        };

        if (existingScript) {
            existingScript.addEventListener("load", handleScriptLoad);

            if (existingScript.dataset.calendlyLoaded === "true" || (window as typeof window & { Calendly?: unknown }).Calendly) {
                handleScriptLoad();
            }

            return () => {
                existingScript.removeEventListener("load", handleScriptLoad);
            };
        }

        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.dataset.calendlyScript = "true";
        const onLoad = () => {
            script.dataset.calendlyLoaded = "true";
            handleScriptLoad();
        };
        script.addEventListener("load", onLoad);
        document.body.appendChild(script);

        return () => {
            script.removeEventListener("load", onLoad);
        };
    }, [refreshToken]);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        const normalizedUrl = (() => {
            try {
                const parsed = new URL(url);
                if (!parsed.searchParams.has("hide_gdpr_banner")) {
                    parsed.searchParams.set("hide_gdpr_banner", "1");
                }
                if (!parsed.searchParams.has("hide_event_type_details")) {
                    parsed.searchParams.set("hide_event_type_details", "1");
                }
                return parsed.toString();
            } catch (
                // eslint-disable-next-line no-unused-vars
                _error
            ) {
                const separator = url.includes("?") ? "&" : "?";
                return `${url}${separator}hide_gdpr_banner=1&hide_event_type_details=1`;
            }
        })();

        // Clear existing content
        node.innerHTML = "";
        
        const widget = document.createElement("div");
        widget.className = "calendly-inline-widget";
        widget.dataset.url = normalizedUrl;
        widget.style.minWidth = "320px";
        widget.style.height = `${minHeight}px`;
        node.appendChild(widget);

        // Initialize widget with retry logic
        const initWidget = () => {
            const calendly = (window as typeof window & { Calendly?: { initInlineWidgets?: () => void } }).Calendly;
            if (calendly?.initInlineWidgets) {
                calendly.initInlineWidgets();
            }
        };

        // Try immediate initialization
        initWidget();
        
        // Also retry after a short delay to handle race conditions
        const timeoutId = setTimeout(initWidget, 150);

        return () => {
            clearTimeout(timeoutId);
            node.innerHTML = "";
        };
    }, [url, minHeight, refreshToken]);

    useEffect(() => {
        const reinitialize = () => {
            (window as typeof window & { Calendly?: { initInlineWidgets?: () => void } }).Calendly?.initInlineWidgets?.();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                reinitialize();
            }
        };

        window.addEventListener("focus", reinitialize);
        window.addEventListener("pageshow", reinitialize);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", reinitialize);
            window.removeEventListener("pageshow", reinitialize);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return <div ref={containerRef} className={className} />;
}
