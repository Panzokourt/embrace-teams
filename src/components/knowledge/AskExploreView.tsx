import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion, Network } from "lucide-react";
import { KBAskChat } from "./KBAskChat";
import { GraphExplorer } from "./GraphExplorer";

interface Props {
  onAsk: (q: string) => void;
  answer: string;
  isLoading: boolean;
}

export function AskExploreView({ onAsk, answer, isLoading }: Props) {
  const [mode, setMode] = useState<"ask" | "graph">("ask");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-muted rounded-lg p-1">
          <Button
            size="sm"
            variant={mode === "ask" ? "default" : "ghost"}
            onClick={() => setMode("ask")}
            className="gap-1.5 h-8"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Ρώτα
          </Button>
          <Button
            size="sm"
            variant={mode === "graph" ? "default" : "ghost"}
            onClick={() => setMode("graph")}
            className="gap-1.5 h-8"
          >
            <Network className="h-3.5 w-3.5" /> Εξερεύνησε
          </Button>
        </div>
        <p className="text-xs text-muted-foreground hidden md:block">
          {mode === "ask"
            ? "Συζήτηση με το AI πάνω στο wiki σου με αναφορές."
            : "Πλοήγηση στις σχέσεις μεταξύ πελατών, έργων, εργασιών και άρθρων."}
        </p>
      </div>

      {mode === "ask" ? (
        <Card>
          <CardContent className="p-0">
            <KBAskChat onAsk={onAsk} answer={answer} isLoading={isLoading} />
          </CardContent>
        </Card>
      ) : (
        <GraphExplorer />
      )}
    </div>
  );
}
