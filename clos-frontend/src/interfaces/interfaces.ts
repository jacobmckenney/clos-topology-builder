interface Topology {
    [level: number]: string[];
}

export type Path = string[][];

interface Paths {
    [pair: string]: Path
}

interface Connections {
    [node: string]: string[];
}

export interface ClosTopology {
    topo: Topology;
    connections: Connections;
    paths: Paths;
}

export interface WindowSize {
    width: undefined | number;
    height: undefined | number;
}

export interface SwitchRefs {
    [key: string]: HTMLDivElement | null;
}

export interface SelectedPath {
    startId: string;
    endId: string;
}