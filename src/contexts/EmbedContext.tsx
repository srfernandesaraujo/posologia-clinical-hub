import { createContext, useContext } from "react";

interface EmbedState {
  isEmbed: boolean;
  caseId: string | null;
}

const EmbedContext = createContext<EmbedState>({ isEmbed: false, caseId: null });

export const EmbedProvider = ({
  children,
  caseId = null,
}: {
  children: React.ReactNode;
  caseId?: string | null;
}) => (
  <EmbedContext.Provider value={{ isEmbed: true, caseId }}>{children}</EmbedContext.Provider>
);

export const useIsEmbed = () => useContext(EmbedContext).isEmbed;
export const useEmbedCaseId = () => useContext(EmbedContext).caseId;
