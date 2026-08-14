import { BookOpen, ShieldCheck, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "真实可信",
    description:
      "每位家教均经学籍认证，学信网 PDF 文件经平台审核，确保你看到的都是真实在读大学生。",
    icon: StudentVerificationIcon,
  },
  {
    title: "告别高价中介",
    description: "直接连接家教和家长，无中介抽成，双方自主定价，透明公平。",
    icon: Users,
  },
  {
    title: "双向平等选择",
    description:
      "家教和家长都有主动权，互相表达意向，匹配成功才交换联系方式，安全有保障。",
    icon: ShieldCheck,
  },
];

function StudentVerificationIcon() {
  return <BookOpen className="h-4 w-4" />;
}

type ValuePropositionCardProps = {
  className?: string;
};

export function ValuePropositionCard({ className }: ValuePropositionCardProps) {
  return (
    <Card className={cn("border-slate-200 shadow-sm", className)}>
      <CardHeader>
        <CardTitle>找家教，就找靠谱的</CardTitle>
        <CardDescription>为什么选择我们？</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <div
              key={feature.title}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-950">
                <Icon />
              </div>
              <div>
                <div className="font-medium text-slate-950">
                  {feature.title}
                </div>
                <div className="text-sm text-slate-500">
                  {feature.description}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
