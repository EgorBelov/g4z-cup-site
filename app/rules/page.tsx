import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/PageHeader";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { community } from "@/lib/community";

export const metadata: Metadata = {
  title: "Регламент",
  description:
    "Правила турниров G4Z CUP: отчёт о результатах, замены игроков, опоздания, технические поражения и запрещённые оскорбления.",
};

type Section = {
  id: string;
  title: string;
  lead?: ReactNode;
  items?: ReactNode[];
};

/**
 * Текст регламента приходит из документа организаторов
 * (data/G4Z_CUP_Регламент.docx). Формулировки сохранены, разбивка на разделы и
 * нумерация — для чтения на сайте.
 */
const sections: Section[] = [
  {
    id: "results-report",
    title: "Отчёт о результатах",
    lead: (
      <p>
        После каждого матча капитаны обязаны присылать фото результата в Discord-канал
        «Результаты». Это обязательное условие для корректного учёта результатов и
        ведения статистики.
      </p>
    ),
  },
  {
    id: "mvp",
    title: "MVP турнира",
    lead: (
      <>
        <p>
          По итогам турнира выбирается MVP — самый ценный игрок. Выбор может
          основываться на статистике или на общем вкладе игрока в победу его команды.
        </p>
        <p>MVP получает приз от организаторов — бочонок пива.</p>
      </>
    ),
  },
  {
    id: "stats",
    title: "Статистика и учёт результатов",
    lead: (
      <p>
        В ходе турнира ведётся полная статистика на нашем сайте{" "}
        <Link href="/">g4z-cup.ru</Link> — она доступна всем участникам. Игроки видят
        свои личные результаты и статистику команды на протяжении всего турнира.
      </p>
    ),
  },
  {
    id: "extra",
    title: "Дополнительные условия",
    lead: (
      <p>
        Все правила турнира, а также возникающие вопросы и спорные моменты решают
        организаторы турнира. Решение организаторов является окончательным.
      </p>
    ),
  },
  {
    id: "substitutions",
    title: "Замены игроков",
    lead: (
      <p>
        В течение турнира допускается не более двух замен игроков для каждой команды.
      </p>
    ),
    items: [
      <>
        Замены разрешены только по уважительным причинам: выход на работу, болезнь и
        другие форс-мажорные обстоятельства.
      </>,
      <>Все замены согласуются с организаторами турнира до начала матча.</>,
      <>
        Разница между заменённым игроком и заменяющим — не более 500 MMR в большую
        сторону, если у команды нет запаса по MMR.
      </>,
      <>
        Если команда не смогла заменить игрока в течение получаса с начала назначенного
        времени матча, ей присуждается техническое поражение.
      </>,
    ],
  },
  {
    id: "delays",
    title: "Опоздания и задержки",
    items: [
      <>
        Матчи начинаются строго по расписанию: начинать игры раньше поставленного
        времени нельзя. Доиграли раньше — ждём время, доиграли позже — стартуем сразу.
      </>,
      <>
        При технических проблемах у команды есть 30 минут, чтобы их решить (починить или
        заменить игрока). Если за это время проблема не решилась, команде присваивается
        техническое поражение.
      </>,
    ],
  },
  {
    id: "insults",
    title: "Запрещённые оскорбления",
    lead: <p>На турнире запрещены:</p>,
    items: [
      <>родственные оскорбления;</>,
      <>
        оскорбления, унижающие человеческое достоинство в грубой, циничной форме —
        нецензурная брань в адрес личности, а не игровых действий.
      </>,
    ],
  },
  {
    id: "discord",
    title: "Присутствие в Discord",
    lead: (
      <p>
        Как минимум один игрок команды должен сидеть в Discord-канале турнира, чтобы с
        командой было легко связаться.
      </p>
    ),
  },
  {
    id: "results",
    title: "Результаты",
    lead: (
      <p>
        Все результаты освещаются в официальном Telegram-канале организатора турнира —
        G4Z Official page.
      </p>
    ),
  },
];

export default function RulesPage() {
  return (
    <div className="orbit-community flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Container className="orbit-doc">
          <header className="orbit-doc-hero">
            <p className="orbit-eyebrow">Сообщество / Правила</p>
            <h1 className="orbit-page-title">Регламент</h1>
            <p className="orbit-doc-lead">
              Как проходят матчи G4Z CUP: учёт результатов, замены, опоздания и спорные
              моменты. Регламент один для всех турниров сообщества.
            </p>
          </header>

          <div className="orbit-doc-grid">
            <nav className="orbit-doc-toc" aria-label="Содержание регламента">
              <p className="orbit-doc-toc-title">Содержание</p>
              {sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`}>
                  <b aria-hidden="true">{String(index + 1).padStart(2, "0")}</b>
                  <span>{section.title}</span>
                </a>
              ))}
            </nav>

            <div className="orbit-doc-body">
              {sections.map((section, index) => (
                <article className="orbit-doc-section" id={section.id} key={section.id}>
                  <span className="orbit-doc-num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2>{section.title}</h2>
                  {section.lead}
                  {section.items ? (
                    <ul className="orbit-doc-list">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}

              <p className="orbit-doc-note">
                Спорные ситуации разбирают организаторы — их решение окончательное. Если
                что-то в регламенте не описано, спросите до матча, а не после.
              </p>

              <div className="orbit-doc-footer">
                <span>Вопросы по регламенту — в Telegram организаторов.</span>
                {community.telegram ? (
                  <a
                    href={community.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center hover:text-ink"
                  >
                    G4Z Official page ↗
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
