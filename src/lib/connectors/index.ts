// רישום כל ה-connectors. הוספת מקור = הוספת שורה כאן.
import type { Connector } from "./types";
import { urbanRenewalConnector } from "./urbanRenewal";
import { iplanConnector } from "./iplan";
import { dangerousBuildingsConnector } from "./dangerousBuildings";
import { demolitionPermitConnector } from "./demolitionPermit";
import type { Source } from "@/lib/domain";

export const CONNECTORS: Connector[] = [
  urbanRenewalConnector,
  iplanConnector,
  dangerousBuildingsConnector,
  demolitionPermitConnector,
];

export function getConnector(source: Source): Connector | undefined {
  return CONNECTORS.find((c) => c.source === source);
}
