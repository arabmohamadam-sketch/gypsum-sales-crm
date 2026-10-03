"use client";

import { useSyncExternalStore } from "react";

const EMPTY_QUERY_ID = "";

function subscribe(callback: () => void): () => void {
  const handleUrlChange = () => {
    callback();
  };

  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("hashchange", handleUrlChange);

  return () => {
    window.removeEventListener("popstate", handleUrlChange);
    window.removeEventListener("hashchange", handleUrlChange);
  };
}

function getSnapshot(): string {
  return (
    new URLSearchParams(window.location.search).get("id") ??
    EMPTY_QUERY_ID
  );
}

function getServerSnapshot(): string {
  return EMPTY_QUERY_ID;
}

export function useQueryId(): string {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
