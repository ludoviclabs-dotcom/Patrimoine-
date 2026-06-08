import { AppShell } from "@/components/app-shell";
import { Reveal } from "@/components/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { ReviewWorkbench } from "@/components/review-workbench";
import { ReviewQueue, RiskPanel } from "@/components/v2-6/cabinet-refonte";

export default function ReviewPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Contrôle humain"
          title="Revue"
          lead="File de revue humaine : cas bloquants, motif, professionnel requis et prochaine action. Une simulation sensible ne devient jamais un livrable sans validation."
        />

        <ReviewQueue />
        <RiskPanel />

        <Reveal>
          <Card elevated>
            <Accordion type="single" collapsible>
              <AccordionItem value="workbench">
                <AccordionTrigger>Tester le workbench de décision historique</AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <ReviewWorkbench />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </Reveal>
      </div>
    </AppShell>
  );
}
