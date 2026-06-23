import { useEffect, useRef, useCallback, useState } from "react";
import { SessionController } from "./sessionController";
import { generateFingerprint } from "../api/langchainClient";
import { defaultConfig } from "../api/langchainClient";

export function useChromaSession({
  storyId,
  startingEmotion,
  apiConfig = defaultConfig,
  previousArcPoints = null,
}) {
  const controllerRef = useRef(null);

  const [cssVars, setCssVars] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [imageBar, setImageBar] = useState(0);
  const [prompterBar, setPrompterBar] = useState(0);
  const [dominant, setDominant] = useState(
    previousArcPoints && previousArcPoints.length > 0
      ? previousArcPoints[previousArcPoints.length - 1].dominant
      : null
  );
  const [blend, setBlend] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [assistantState, setAssistantState] = useState({ status: "stable", message: null, candidateEmotion: null });

  useEffect(() => {
    const ctrl = new SessionController(storyId, startingEmotion, apiConfig, previousArcPoints);

    ctrl.onColourUpdate = (vars) => {
      setCssVars(vars);
      Object.entries(vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
      const newDominant = ctrl.dominant;
      if (newDominant) setDominant(newDominant);
      setBlend(ctrl.blend);
    };

    ctrl.onSuggestion = (suggestion) => {
      setSuggestions((prev) => [suggestion, ...prev].slice(0, 10));
    };

    ctrl.onBarUpdate = (img, prompt) => {
      setImageBar(img);
      setPrompterBar(prompt);
    };

    ctrl.onAssistantUpdate = (state) => {
      setAssistantState(state);
    };

    ctrl.refreshColour();
    controllerRef.current = ctrl;

    return () => {
      ctrl.destroy();
      const varNames = [
        "--cw-emotion-primary",
        "--cw-emotion-accent",
        "--cw-emotion-blended",
        "--cw-emotion-rgb",
        "--cw-emotion-saturation",
        "--cw-transition-ms",
      ];
      varNames.forEach((v) => document.documentElement.style.removeProperty(v));
    };
  }, [storyId, startingEmotion, apiConfig]);

  const onTextChange = useCallback((text, skipCharge = false) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    void ctrl.onTextChange(text, skipCharge).then(() => {
      setDominant(ctrl.dominant);
      setBlend(ctrl.blend);
    });
  }, []);

  const dismissSuggestion = useCallback((id) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s))
    );
  }, []);

  const consumeImage = useCallback(() => {
    return controllerRef.current?.consumeImageBar() ?? false;
  }, []);

  const consumePrompter = useCallback(() => {
    return controllerRef.current?.consumePrompterBar() ?? false;
  }, []);

  const finishSession = useCallback(async () => {
    const ctrl = controllerRef.current;
    if (!ctrl) {
      return {
        snapshot: {
          points: [],
          dominantOverall: null,
          shiftCount: 0,
          longestFlatline: null,
          conflictMoments: [],
          distribution: {},
        },
        fingerprint: null,
      };
    }

    const snapshot = ctrl.arcSnapshot;
    const fingerprint = await generateFingerprint(
      snapshot.dominantOverall ?? dominant ?? "Serenity",
      snapshot.shiftCount,
      ctrl.sessionState.wordCount,
      snapshot.distribution,
      apiConfig
    );

    return { snapshot, fingerprint };
  }, [apiConfig, dominant]);

  const getArcPoints = useCallback(() => {
    return controllerRef.current?.arcSnapshot.points ?? [];
  }, []);

  return {
    cssVars,
    suggestions,
    imageBar,
    prompterBar,
    dominant,
    blend,
    wordCount,
    getArcPoints,
    onTextChange,
    dismissSuggestion,
    consumeImage,
    consumePrompter,
    finishSession,
    assistantState,
  };
}
