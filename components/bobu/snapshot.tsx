import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import snapshot from "./snapshot.json";

interface Proposal {
  id: string;
  title: string;
  description: string;
  tags: string[];
  costs: string[];
  choices: string[];
  start: number;
  end: number;
  snapshot: number;
  state: string;
  scores: number[];
  scores_total: number;
}

interface SnapshotData {
  proposals: Proposal[];
}

interface SnapshotRoot {
  data: SnapshotData;
}

function formatDatePST(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value;

  return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod}`;
}

export default function Snapshot() {
  const proposals = (snapshot as SnapshotRoot).data.proposals;

  return (
    <div className="grid gap-4">
      {proposals.map((proposal, index) => (
        <Card key={proposal.id}>
          <CardHeader>
            <CardTitle>
              {index + 1}. {proposal.title}
            </CardTitle>
            <CardDescription>
              <p>{proposal.description}</p>
              <table>
                <tbody>
                  <tr>
                    <td className="pr-4">Start:</td>
                    <td>{formatDatePST(proposal.start)} PST</td>
                  </tr>
                  <tr>
                    <td className="pr-4">End:</td>
                    <td>{formatDatePST(proposal.end)} PST</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Tags:</td>
                    <td>{proposal.tags.join(", ")}</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Costs:</td>
                    <td>{proposal.costs.join(", ")}</td>
                  </tr>
                </tbody>
              </table>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="display">Choices:</p>
              <ul className="list-inside list-disc space-y-1">
                {proposal.choices.map((choice, index) => (
                  <li key={index} className="text-sm">
                    {choice} ({proposal.scores[index]?.toLocaleString() || 0}{" "}
                    votes)
                  </li>
                ))}
              </ul>
              <p className="display text-right text-base">
                Total votes: {proposal.scores_total.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
