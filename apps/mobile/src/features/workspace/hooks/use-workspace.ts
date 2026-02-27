import { useCallback, useState } from "react";
import type {
  NL2SQLResult,
  WorkspaceEntry,
  WorkspaceObjectDefinition,
  WorkspaceQueryResult,
} from "../lib";

type UseWorkspaceReturn = {
  objects: WorkspaceObjectDefinition[];
  isLoadingObjects: boolean;
  selectedObject: WorkspaceObjectDefinition | null;
  entries: WorkspaceEntry[];
  totalEntries: number;
  isLoadingEntries: boolean;
  queryResult: WorkspaceQueryResult | null;
  isQuerying: boolean;
  nl2sqlResult: NL2SQLResult | null;
  isGeneratingSQL: boolean;
  selectObject: (name: string) => void;
  refreshObjects: () => void;
  loadEntries: (objectName: string, offset?: number) => void;
  runQuery: (sql: string) => void;
  askQuestion: (question: string, objectName?: string) => void;
};

export function useWorkspace(): UseWorkspaceReturn {
  const [objects, setObjects] = useState<WorkspaceObjectDefinition[]>([]);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [selectedObject, setSelectedObject] =
    useState<WorkspaceObjectDefinition | null>(null);
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [queryResult, setQueryResult] = useState<WorkspaceQueryResult | null>(
    null
  );
  const [isQuerying, setIsQuerying] = useState(false);
  const [nl2sqlResult, setNl2sqlResult] = useState<NL2SQLResult | null>(null);
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false);

  const refreshObjects = useCallback(() => {
    setIsLoadingObjects(true);
    setObjects([]);
    setIsLoadingObjects(false);
  }, []);

  const selectObject = useCallback(
    (name: string) => {
      const obj = objects.find((o) => o.name === name) ?? null;
      setSelectedObject(obj);
      if (obj) {
        setIsLoadingEntries(true);
        setEntries([]);
        setTotalEntries(0);
        setIsLoadingEntries(false);
      }
    },
    [objects]
  );

  const loadEntries = useCallback((_objectName: string, _offset?: number) => {
    setIsLoadingEntries(true);
    setEntries([]);
    setTotalEntries(0);
    setIsLoadingEntries(false);
  }, []);

  const runQuery = useCallback((_sql: string) => {
    setIsQuerying(true);
    setQueryResult(null);
    setIsQuerying(false);
  }, []);

  const askQuestion = useCallback((_question: string, _objectName?: string) => {
    setIsGeneratingSQL(true);
    setNl2sqlResult(null);
    setIsGeneratingSQL(false);
  }, []);

  return {
    objects,
    isLoadingObjects,
    selectedObject,
    entries,
    totalEntries,
    isLoadingEntries,
    queryResult,
    isQuerying,
    nl2sqlResult,
    isGeneratingSQL,
    selectObject,
    refreshObjects,
    loadEntries,
    runQuery,
    askQuestion,
  };
}
