import React, { useState, useEffect, useRef } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import Switch from "../components/Switch";
import { PlusCircledIcon, MinusCircledIcon } from "@radix-ui/react-icons";
import styles from "./index.module.css";
import { motion } from "framer-motion";
import { setTimeout } from "timers";
import type { SelectedPath, ClosTopology, WindowSize, SwitchRefs, Path } from "../interfaces/interfaces";

const MAX_SWITCH_DEGREE = 12;
const MIN_SWITCH_DEGREE = 2;
const ROW_GAP_PX = 2;
const NODE_HEIGHT = 20;
const MAX_NODE_WIDTH = 40;
const LEVEL_TO_LABEL: { [key: string]: string } = {
    "0": "Server",
    "1": "TOR",
    "2": "Agg",
    "3": "Core",
};

function useWindowSize() {
    // Initialize state with undefined width/height so server and client renders match
    // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: undefined,
        height: undefined,
    });
    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            // Set window width/height to state
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        // Add event listener
        window.addEventListener("resize", handleResize);
        // Call handler right away so state gets updated with initial window size
        handleResize();
        // Remove event listener on cleanup
        return () => window.removeEventListener("resize", handleResize);
    }, []); // Empty array ensures that effect is only run on mount
    return windowSize;
}

const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: () => {
        return {
            pathLength: 1,
            opacity: 1,
            transition: {
                pathLength: { type: "spring", duration: 1.5, bounce: 0 },
                opacity: { duration: 0.01 },
            },
        };
    },
};

const maxServers = (switchDegree: number, uplinkNum: number, levels: number) =>
    Math.pow(switchDegree - uplinkNum, levels - 1) * switchDegree;

const getRate = (switchDegree: number, uplinkNum: number) => {
    let downlink: number = switchDegree - uplinkNum;
    if (downlink == uplinkNum) return "1:1";
    while (downlink % 2 == 0 && uplinkNum % 2 == 0) {
        downlink /= 2;
        uplinkNum /= 2;
    }
    return `${downlink}:${uplinkNum}`;
};

const Home: NextPage = () => {
    const [loadingTopo, setLoadingTopo] = useState(false);
    const [topology, setTopology] = useState<ClosTopology | undefined>(undefined);
    const [numServers, setNumServers] = useState(1);
    const [switchDegree, setSwitchDegree] = useState(4);
    const [uplinkNum, setUplinkNum] = useState(switchDegree / 2);
    const [wiring, setWiring] = useState(false);
    const [levels, setLevels] = useState(3); // TODO: support more levels
    const [selectedPath, setSelectedPath] = useState<SelectedPath>({ startId: "", endId: "" });
    const [path, setPath] = useState<Path | undefined>(undefined);
    const { width, height } = useWindowSize();
    const switchRef = useRef<SwitchRefs>({});

    const refetch = async (ls: number, degree: number, nservers: number, uplinks: number) => {
        setWiring(false);
        setLoadingTopo(true);
        const res = await fetch(
            `http://localhost:4567/topo?levels=${ls}&switchDegree=${degree}&numServers=${nservers}&uplinkNum=${uplinks}`
        );
        setLoadingTopo(false);
        const newTopo: ClosTopology = await res.json();
        setTopology(newTopo);
        setNumServers(nservers);
        // Set delay so x/y values of new topo are correctly set before wiring
        setTimeout(() => setWiring(true), 200);
    };

    // Initial fetch of topo
    useEffect(() => {
        refetch(levels, switchDegree, maxServers(switchDegree, uplinkNum, levels), uplinkNum);
    }, []);

    useEffect(() => {
        const { startId, endId } = selectedPath;
        if (startId && endId && topology?.paths) {
            const pathId = `${startId}-${endId}`;
            if (topology.paths[pathId]) {
                setPath(topology.paths[pathId]);
            } else {
                const reversePathId = `${endId}-${startId}`;
                setPath(topology.paths[reversePathId]);
            }
        } else {
            setPath(undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPath]);

    const getAnchorPoint = (top: boolean, nodeId: string) => {
        const nodeSwitch: HTMLDivElement | null | undefined = switchRef.current[nodeId];
        if (nodeSwitch) {
            const node: HTMLDivElement = nodeSwitch;
            const { x: x1, y: y1, height, width } = node.getBoundingClientRect();
            return { x: x1 + width / 2, y: y1 + (top ? 0 : height) };
        }
        return { x: 0, y: 0 };
    };

    const getAnchorSide = (startNodeId: string, endNodeId: string) => {
        const startTop: boolean = parseInt(startNodeId.charAt(0)) < parseInt(endNodeId.charAt(0));
        return { startTop, endTop: !startTop };
    };

    return (
        <>
            <motion.svg
                width={width}
                height={height}
                viewBox={`0 0 ${width ?? 0} ${height ?? 0}`}
                initial="hidden"
                animate="visible"
                style={{ position: "absolute", zIndex: "-5" }}
            >
                {wiring &&
                    path &&
                    path.map(([startNode, endNode], i) => {
                        if (!startNode || !endNode) {
                            return <div key={i} />;
                        }
                        const { startTop, endTop } = getAnchorSide(startNode, endNode);
                        const { x: x1, y: y1 } = getAnchorPoint(startTop, startNode);
                        const { x: x2, y: y2 } = getAnchorPoint(endTop, endNode);
                        return (
                            <motion.line
                                key={`${startNode}->${endNode}`}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#ddbfaa"
                                variants={draw}
                            />
                        );
                    })}
            </motion.svg>
            <motion.svg
                width={width}
                height={height}
                viewBox={`0 0 ${width ?? 0} ${height ?? 0}`}
                initial="hidden"
                animate="visible"
                style={{ position: "absolute", zIndex: "-10", backgroundColor: "#1a1a1a" }}
            >
                {/* wire when connections are fetched */}
                {/* TODO: wires are drawn twice */}
                {wiring &&
                    topology &&
                    Object.entries(topology.connections).map(([startNode, connections]) => {
                        return connections.map((endNode) => {
                            const { startTop, endTop } = getAnchorSide(startNode, endNode);
                            const { x: x1, y: y1 } = getAnchorPoint(startTop, startNode);
                            const { x: x2, y: y2 } = getAnchorPoint(endTop, endNode);
                            if (![x1, y1, x2, y2].every((val) => val !== 0)) {
                                return <div key={`${startNode}->${endNode}`} />;
                            }
                            return (
                                <motion.line
                                    key={`${startNode}->${endNode}`}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#8831de"
                                    variants={draw}
                                />
                            );
                        });
                    })}
            </motion.svg>
            <Head>
                <title>Clos Topology Builder</title>
                <meta name="description" content="Generated by create-t3-app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className={styles.headerBar}>
                <h3>Clos Topology Builder</h3>
                {loadingTopo && <p>fetching topology...</p>}
                <div>
                    Subscription Rate: {getRate(switchDegree, uplinkNum)}
                    {uplinkNum + 1 <= switchDegree / 2 && (
                        <PlusCircledIcon
                            className={styles.adjustmentButton}
                            onClick={async () => {
                                await refetch(
                                    levels,
                                    switchDegree,
                                    maxServers(switchDegree, uplinkNum + 1, levels),
                                    uplinkNum + 1
                                );
                                setUplinkNum((prev) => prev + 1);
                                setSelectedPath({ startId: "", endId: "" });
                            }}
                        />
                    )}
                    {uplinkNum - 1 >= 1 && (
                        <MinusCircledIcon
                            className={styles.adjustmentButton}
                            onClick={async () => {
                                await refetch(
                                    levels,
                                    switchDegree,
                                    maxServers(switchDegree, uplinkNum - 1, levels),
                                    uplinkNum - 1
                                );
                                setUplinkNum((prev) => prev - 1);
                                setSelectedPath({ startId: "", endId: "" });
                            }}
                        />
                    )}
                </div>
                <div>
                    Switch Degree: {switchDegree}
                    {switchDegree + 2 <= MAX_SWITCH_DEGREE && (
                        <PlusCircledIcon
                            className={styles.adjustmentButton}
                            onClick={async () => {
                                if (switchDegree + 2 > MAX_SWITCH_DEGREE) {
                                    return;
                                }
                                await refetch(
                                    levels,
                                    switchDegree + 2,
                                    maxServers(switchDegree + 2, (switchDegree + 2) / 2, levels),
                                    (switchDegree + 2) / 2
                                );
                                setUplinkNum((switchDegree + 2) / 2);
                                setSwitchDegree((prev) => prev + 2);
                                setSelectedPath({ startId: "", endId: "" });
                            }}
                        />
                    )}
                    {switchDegree - 2 >= MIN_SWITCH_DEGREE && (
                        <MinusCircledIcon
                            className={styles.adjustmentButton}
                            onClick={async () => {
                                await refetch(
                                    levels,
                                    switchDegree - 2,
                                    maxServers(switchDegree - 2, (switchDegree - 2) / 2, levels),
                                    (switchDegree - 2) / 2
                                );
                                setUplinkNum((switchDegree - 2) / 2);
                                setSwitchDegree((prev) => prev - 2);
                                setSelectedPath({ startId: "", endId: "" });
                            }}
                        />
                    )}
                </div>
            </div>
            <div className={styles.containerInner}>
                {/* Render switches */}
                {topology &&
                    Object.entries(topology.topo)
                        .reverse()
                        .map(([level, nodes], i) => {
                            const isServerLevel: boolean = level === "0";
                            const levelNodes: string[] = isServerLevel ? nodes.slice(0, numServers) : nodes;
                            return (
                                <div key={i} className={styles.cardGrid} style={{ gap: `${ROW_GAP_PX}px` }}>
                                    <div>{LEVEL_TO_LABEL[level]}</div>
                                    {isServerLevel && numServers >= 1 && (
                                        <MinusCircledIcon
                                            className={styles.adjustmentButton}
                                            onClick={() => {
                                                setWiring(false);
                                                setSelectedPath((prev) => {
                                                    if (
                                                        parseInt(prev.startId.substring(0, prev.startId.length)) >
                                                        numServers - 2
                                                    ) {
                                                        return { ...prev, startId: "" };
                                                    }
                                                    if (
                                                        parseInt(prev.endId.substring(0, prev.endId.length)) >
                                                        numServers - 2
                                                    ) {
                                                        return { ...prev, endId: "" };
                                                    }
                                                    return prev;
                                                });
                                                setNumServers((prev) => prev - 1);
                                                setTimeout(() => setWiring(true), 200);
                                            }}
                                        />
                                    )}
                                    {levelNodes.map((nodeId: string, j: number) => (
                                        <Switch
                                            levelCount={nodes.length}
                                            key={`${i}${j}`}
                                            id={nodeId}
                                            switchRef={switchRef}
                                            selected={selectedPath.startId === nodeId || selectedPath.endId === nodeId}
                                            setSelectedPath={setSelectedPath}
                                            width={width ? Math.min((width - 200) / nodes.length, MAX_NODE_WIDTH) : 0}
                                            height={NODE_HEIGHT}
                                        />
                                    ))}
                                    {isServerLevel && numServers + 1 <= maxServers(switchDegree, uplinkNum, levels) && (
                                        <PlusCircledIcon
                                            className={styles.adjustmentButton}
                                            onClick={() => {
                                                setWiring(false);
                                                setNumServers((prev) => prev + 1);
                                                setTimeout(() => setWiring(true), 200);
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
            </div>
        </>
    );
};

export default Home;
