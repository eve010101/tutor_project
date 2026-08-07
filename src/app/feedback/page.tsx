"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAIL = "weiming_0205@qq.com";

export default function FeedbackPage() {
  const [category, setCategory] = useState("产品建议");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    const subject = encodeURIComponent(`平台意见反馈｜${category}`);
    const body = encodeURIComponent(
      `反馈类型：${category}\n联系方式：${contact.trim() || "未填写"}\n\n反馈内容：\n${message.trim()}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Link>
        <Card className="mt-6 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">意见反馈</CardTitle>
            <CardDescription>
              告诉我们你遇到的问题或想要的改进，我们会通过邮件查看并处理。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="feedback-category">反馈类型</Label>
                <select
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                  id="feedback-category"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  <option>产品建议</option>
                  <option>页面问题</option>
                  <option>匹配问题</option>
                  <option>其他</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-contact">联系方式（选填）</Label>
                <Input
                  id="feedback-contact"
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="手机号或邮箱"
                  value={contact}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-message">反馈内容</Label>
                <Textarea
                  id="feedback-message"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="请具体描述问题、发生页面和你的建议"
                  required
                  value={message}
                />
              </div>
              <Button className="w-full sm:w-auto" type="submit">
                <Send className="h-4 w-4" aria-hidden="true" />
                打开邮件发送
              </Button>
              {submitted ? (
                <p className="text-sm text-emerald-700" role="status">
                  已准备好反馈邮件。如果邮件客户端没有自动打开，请直接发送至{" "}
                  {CONTACT_EMAIL}。
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
