"use client";

import { useEffect, useState } from "react";

export function useQueryId(): string {
  const [id, setId] = useState("");

  useEffect(() => {
    const value =
      new URLSearchParams(window.location.search).get("id") ?? "";

    setId(value);
  }, []);

  return id;
}
