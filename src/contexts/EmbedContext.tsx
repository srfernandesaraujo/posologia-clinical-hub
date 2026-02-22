import { createContext, useContext } from "react";

const EmbedContext = createContext(false);

export const EmbedProvider = ({ children }: { children: React.ReactNode }) => (
  <EmbedContext.Provider value={true}>{children}</EmbedContext.Provider>
);

export const useIsEmbed = () => useContext(EmbedContext);
