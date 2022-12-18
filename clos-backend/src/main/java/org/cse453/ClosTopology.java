package org.cse453;

import java.io.Serializable;
import java.util.List;
import java.util.stream.*;
import java.util.*;
import org.javatuples.Pair;
public class ClosTopology {
    private Set<Node> allNodes;
    private int numServers;
    private int numCore;
    private int numAgg;
    private int numTor;
    private int numSwitches;
    private int maxServers;
    private int levels;

    public ClosTopology (int levels, int numServers, int switchDegree, int uplinkNum) {
        
        this.allNodes = new HashSet<>();
        this.levels = levels;
        int downlinkNum = switchDegree - uplinkNum;
        
        this.maxServers = (int) Math.pow(downlinkNum, levels - 1) * switchDegree;
        this.numServers = numServers > this.maxServers ? maxServers : numServers;
        
        int podSize = uplinkNum;
        this.numCore = podSize * uplinkNum;
        this.numAgg = podSize * switchDegree;
        this.numTor = downlinkNum * switchDegree;

        
        this.numSwitches = this.numCore + this.numAgg + this.numTor;

        // Add switches to topo
        for (int i = 0; i < numCore; i++) {
            this.addNode(new Node(3, i));
        }
        for (int i = 0; i < numAgg; i++) {
            this.addNode(new Node(2, i));
        }
        for (int i = 0; i < numTor; i++) {
            this.addNode(new Node(1, i));
        }
        for (int i = 0; i < this.numServers; i++) {
            this.addNode(new Node(0, i));
        }
        System.out.println("Added switches");
        // Wire topo
        List<Node> coreSwitches = this.nodesWithLevel(3);
        List<Node> aggSwitches = this.nodesWithLevel(2);
        List<Node> torSwitches = this.nodesWithLevel(1);
        List<Node> servers = this.nodesWithLevel(0);
        // Connect core to Agg
        for (int i = 0; i < numCore; i++) {
            for (int j = 0; j < switchDegree; j++) {
                this.addEdge(coreSwitches.get(i), aggSwitches.get((i + (j * podSize)) % numAgg));
            }
        }
        System.out.println("Wired core to agg");
        // Connect agg to tor
        for (int i = 0; i < numAgg; i+= podSize) {
            for (int j = 0; j < podSize; j++) {
                for (int k = 0; k < downlinkNum; k++) {
                    this.addEdge(aggSwitches.get(i + j), torSwitches.get(i * downlinkNum / podSize  + k));
                }
            }
        }
        System.out.println("Wired agg to tor");
        // Connect tor to servers
        for (int i = 0; i < numTor; i++) {
            for (int j = 0; j < downlinkNum; j++) {
                int connectingServerIdx = (i * downlinkNum) + j;
                if (connectingServerIdx >= servers.size()) {
                    break;
                }
                this.addEdge(torSwitches.get(i), servers.get(connectingServerIdx));
            }
        }
        System.out.println("Wired tor to servers");
        System.out.println("Wired topo");
    }

    private List<String> toSerializable(List<Node> l) {
        return l.stream().map(n -> n.toString()).collect(Collectors.toList());
    }

    public List<Node> nodesWithLevel(int level) {
        return this.allNodes.stream().filter(node -> node.getLevel() == level).sorted().collect(Collectors.toList());
    }

    public Map<Integer, List<String>> getTopology() {
        Map<Integer, List<String>> topo = new HashMap<>();
        for (int i = 0; i <= this.levels; i++) {
            topo.put(i, this.toSerializable(this.nodesWithLevel(i)));
        }
        return topo;
    }

    public Map<String, List<String>> getConnections() {
        return this.allNodes.stream().collect(Collectors.toMap(Node::toString, Node::connectedNodeStrings));
    }

    

    public Map<String, List<List<String>>> getServerPaths() {
        List<Node> servers = this.nodesWithLevel(0);
        Set<List<String>> paths = new HashSet<>();
        Set<Pair<Node, Node>> serverPairs = new HashSet<>();
        for (int i = 0; i < servers.size(); i++) {
            for (int j = 0; j < servers.size(); j++) {
                Pair<Node, Node> curr = new Pair<>(servers.get(i), servers.get(j));
                if (!servers.get(i).equals(servers.get(j)) && !serverPairs.contains(new Pair<>(servers.get(j), servers.get(i))) && serverPairs.add(curr)) {
                    List<Node> shortest = findShortestPath(curr);
                    if (shortest == null) {
                        System.out.println("ERROR! no path found");
                    } else {
                        paths.add(this.toSerializable(shortest));
                    }
                }
            }
        }

        return this.pathsToPathPairs(paths);
    }

    private Map<String, List<List<String>>> pathsToPathPairs(Set<List<String>> paths) {
        Map<String, List<List<String>>> newPaths = new HashMap(paths.size());
        for (List<String> path : paths) {
            List<List<String>> newPath = new ArrayList<>();
            for (int i = 0; i < path.size() - 1; i+= 1) {
                List<String> pathPair = new ArrayList<>(2);
                pathPair.add(path.get(i));
                pathPair.add(path.get(i + 1));
                newPath.add(pathPair);
            }
            newPaths.put(String.format("%s-%s", path.get(0), path.get(path.size() - 1)), newPath);
        }
        return newPaths;
    }

    private List<Node> findShortestPath(Pair<Node, Node> serverPair) {
        // Queue always returns shortest path by length
        Queue<List<Node>> active = new PriorityQueue<>(10, (a, b) -> a.size() < b.size() ? -1 : (a.size() > b.size() ? 1 : 0));
        Set<Node> seen = new HashSet<>();
        List<Node> startPath = new ArrayList<>();
        startPath.add(serverPair.getValue0());
        active.add(startPath);
        while (!active.isEmpty()) { // iterate until path find or no more paths
            List<Node> curr = active.poll();
            Node last = curr.get(curr.size() - 1);
            if (last.equals(serverPair.getValue1())) { // shortest path found
                return curr;
            }
            if (!seen.contains(last)) {
                for (Node nextNode : last.getConnectedNodes()) {
                    if (!seen.contains(nextNode)) {
                        List<Node> newPath = new ArrayList<>(curr);
                        newPath.add(nextNode);
                        active.add(newPath);
                    }
                }
                seen.add(last);
            }
        }
        return null; // No path found
    }

    public boolean addNode(Node n) {
        return this.allNodes.add(n);
    }

    public boolean removeNode(Node n) {
        for (Node adjacent : n.getConnectedNodes()) {
            adjacent.removeConnection(n);
        }
        return this.allNodes.remove(n);
    }

    public void addEdge(Node a, Node b) {
        a.addConnection(b);
        b.addConnection(a);
    }

    public String toString() {
        return String.format("numCore: %s numAgg: %s numTor %S", numCore, numAgg, numTor);
    }

    public static class Node implements Comparable<Node> {
        private Set<Node> connectedNodes;
        private int level;
        private int serverInLevel;

        public Node(int level, int serverInLevel) {
            this.connectedNodes = new HashSet<>();
            this.level = level;
            this.serverInLevel = serverInLevel;
        }

        public Set<Node> getConnectedNodes() {
            return connectedNodes;
        }

        public List<String> connectedNodeStrings() {
            return this.connectedNodes.stream().map(n -> n.toString()).collect(Collectors.toList());
        }

        public int getLevel() {
            return this.level;
        }

        public void addConnection(Node n) {
            connectedNodes.add(n);
        }

        public void removeConnection(Node n) {
             connectedNodes.remove(n);
        }

        public String toString() {
            return String.format("%s%s", level, serverInLevel);
        }
    @Override
        public boolean equals(Object obj) {
            if (obj == this) {
                return true;
            }
            if (!(obj instanceof Node)) {
                return false;
            }
            Node other = (Node) obj;
            return this.level == other.level && this.serverInLevel == other.serverInLevel;
        }

        @Override
        public int compareTo(Node other) {
            if (this.level == other.level) {
                return this.serverInLevel > other.serverInLevel ? 1 : (this.serverInLevel < other.serverInLevel ? -1 : 0);
            } else if (this.level > other.level) {
                return 1;
            } else {
                return -1;
            }
        }
    }
    public static class ReturnObject implements Serializable {
        public Map<Integer, List<String>> topo;
        public Map<String, List<String>> connections;
        public Map<String, List<List<String>>> paths;
        public ReturnObject(Map<Integer, List<String>> topo, Map<String, List<String>> connections, Map<String, List<List<String>>> paths) {
            this.topo = topo;
            this.connections = connections;
            this.paths = paths;

        }
    }
}
