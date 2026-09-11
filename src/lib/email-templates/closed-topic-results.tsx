import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface ClosedTopicResultsProps {
  title?: string;
  city?: string;
  category?: string;
  agree?: number;
  disagree?: number;
  neutral?: number;
  total?: number;
  commentCount?: number;
  resultsUrl?: string;
}

function ClosedTopicResults({
  title = "YouthVoice community topic",
  city = "Fargo–Moorhead–West Fargo",
  category = "Community",
  agree = 0,
  disagree = 0,
  neutral = 0,
  total = 0,
  commentCount = 0,
  resultsUrl = "https://youthvoice.world",
}: ClosedTopicResultsProps) {
  const percent = (votes: number) => (total > 0 ? Math.round((votes / total) * 100) : 0);

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`YouthVoice results: ${title}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>YOUTHVOICE</Text>
          <Heading style={styles.heading}>A community topic has closed</Heading>
          <Text style={styles.kicker}>{`${city} · ${category}`}</Text>
          <Heading as="h2" style={styles.title}>{title}</Heading>

          <Section style={styles.results}>
            <Text style={styles.resultLine}><strong>Agree:</strong> {agree} ({percent(agree)}%)</Text>
            <Text style={styles.resultLine}><strong>Disagree:</strong> {disagree} ({percent(disagree)}%)</Text>
            <Text style={styles.resultLine}><strong>Neutral:</strong> {neutral} ({percent(neutral)}%)</Text>
            <Hr style={styles.rule} />
            <Text style={styles.resultLine}><strong>Total votes:</strong> {total}</Text>
            <Text style={styles.resultLine}><strong>Public discussion comments:</strong> {commentCount}</Text>
          </Section>

          <Link href={resultsUrl} style={styles.button}>View the full results</Link>
          <Text style={styles.note}>
            YouthVoice gathers anonymous perspectives from young people who cannot yet vote. These results reflect voluntary participation and are not a scientific sample.
          </Text>
          <Hr style={styles.footerRule} />
          <Text style={styles.footer}>Abhi Kotala · YouthVoice</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: ClosedTopicResults,
  subject: (data) => `YouthVoice results: ${String(data.title ?? "Community topic")}`,
  displayName: "Closed topic results",
  previewData: {
    title: "Should the city expand youth transit access?",
    city: "Fargo",
    category: "Transportation",
    agree: 42,
    disagree: 13,
    neutral: 5,
    total: 60,
    commentCount: 18,
    resultsUrl: "https://youthvoice.world",
  },
} satisfies TemplateEntry;

const styles = {
  body: { backgroundColor: "#ffffff", color: "#172033", fontFamily: "Arial, sans-serif", margin: 0 },
  container: { margin: "0 auto", maxWidth: "600px", padding: "36px 24px" },
  brand: { color: "#087f8c", fontSize: "13px", fontWeight: 700, letterSpacing: "2px", margin: "0 0 20px" },
  heading: { color: "#172033", fontSize: "28px", lineHeight: "36px", margin: "0 0 12px" },
  kicker: { color: "#526176", fontSize: "14px", margin: "0 0 10px" },
  title: { color: "#172033", fontSize: "21px", lineHeight: "29px", margin: "0 0 24px" },
  results: { backgroundColor: "#f2f7f8", border: "1px solid #d8e5e7", borderRadius: "8px", padding: "18px 20px" },
  resultLine: { color: "#263448", fontSize: "15px", lineHeight: "23px", margin: "5px 0" },
  rule: { borderColor: "#d8e5e7", margin: "14px 0" },
  button: { backgroundColor: "#087f8c", borderRadius: "6px", color: "#ffffff", display: "inline-block", fontSize: "15px", fontWeight: 700, margin: "24px 0", padding: "12px 18px", textDecoration: "none" },
  note: { color: "#526176", fontSize: "13px", lineHeight: "20px", margin: "0" },
  footerRule: { borderColor: "#e5e9ef", margin: "28px 0 18px" },
  footer: { color: "#6c7788", fontSize: "12px", margin: 0 },
};