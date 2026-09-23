import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EvoMind — ясные задачи для сильных команд",
  description: "Конструктор, рейтинг и каталог бизнес-задач",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
