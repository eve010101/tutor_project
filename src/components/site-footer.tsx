"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquareText, ShieldAlert, X } from "lucide-react";

const CONTACT_EMAIL = "weiming_0205@qq.com";

export function SiteFooter() {
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isDisclaimerOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDisclaimerOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDisclaimerOpen]);

  return (
    <>
      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
          <div className="space-y-3">
            <p className="text-base font-semibold text-white">
              燕启家教
            </p>
            <p className="text-sm leading-6 text-slate-300">
              真实可信的家教资源，告别高价中介
            </p>
            <p className="text-sm text-slate-400">北大在读学生创立</p>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <a
              className="inline-flex items-center gap-2 transition-colors hover:text-white"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
            <Link
              className="inline-flex items-center gap-2 transition-colors hover:text-white"
              href="/feedback"
            >
              <MessageSquareText
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              意见反馈
            </Link>
            <button
              className="inline-flex items-center gap-2 text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              onClick={() => setIsDisclaimerOpen(true)}
              type="button"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              免责声明
            </button>
          </div>
        </div>
      </footer>

      {isDisclaimerOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsDisclaimerOpen(false);
            }
          }}
          role="presentation"
        >
          <section
            aria-labelledby="disclaimer-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl sm:p-7"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-sky-700">安全提示</p>
                <h2
                  className="mt-1 text-xl font-semibold text-slate-950"
                  id="disclaimer-title"
                >
                  免责声明
                </h2>
              </div>
              <button
                aria-label="关闭免责声明"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                onClick={() => setIsDisclaimerOpen(false)}
                ref={closeButtonRef}
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              平台仅提供信息撮合服务，建议第一次见面选择公共场所，平台不对线下行为负责，所有家教均经过学信网
              PDF 文件审核。
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
