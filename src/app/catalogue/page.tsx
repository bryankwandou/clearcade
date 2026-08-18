import { Section } from "../page";
import { CatalogueGrid } from "@/components/catalogue-grid";
import { POOL_USD } from "@/lib/data";

export const metadata = {
  title: "Catalogue — Clearcade",
  description:
    "Every game ranked this epoch, with the inputs behind each placement shown on the card.",
};

export default function CataloguePage() {
  const epoch = 3;
  return (
    <main className="pb-10">
      <Section
        eyebrow={`Epoch ${epoch}`}
        title="Everything ranked this period"
        lede={`A pool of ${POOL_USD[epoch].toLocaleString("en-US")} dollars split along the same scores that set this order. Each card carries the numbers that produced its placement, so a low rank comes with its own explanation attached.`}
      >
        <CatalogueGrid epoch={epoch} />
      </Section>
    </main>
  );
}
