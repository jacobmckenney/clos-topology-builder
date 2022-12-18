package org.cse453;

import com.google.gson.Gson;
import org.cse453.ClosTopology.ReturnObject;
import org.cse453.WriteTopologies;
import java.util.*;
import static spark.Spark.*;
public class Main {

    private static Map<String, ReturnObject> cache;
    private static String CACHE_FILE = "cache.txt";

    public static void main(String[] args) {
//        try {
//            cache = WriteTopologies.Deserialize(CACHE_FILE);
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
        enableCORS("*", "GET,PUT,POST,DELETE,OPTIONS",
                "Content-Type,Authorization,X-Requested-With,Content-Length,Accept,Origin,");
        get("/topo", (req,res) -> {
            Gson gson = new Gson();
            Integer levels = Integer.parseInt(req.queryParams("levels"));
            Integer numServers = Integer.parseInt(req.queryParams("numServers"));
            Integer switchDegree = Integer.parseInt(req.queryParams("switchDegree"));
            Integer uplinkNum = Integer.parseInt(req.queryParams("uplinkNum"));
            String queryKey = String.format("%s-%s-%s-%s", levels, numServers, switchDegree, uplinkNum);
            // if (cache.containsKey(queryKey)) {
            //     return gson.toJson(cache.get(queryKey));
            // }
            ClosTopology topology = new ClosTopology(levels, numServers, switchDegree, uplinkNum);
            ReturnObject ro = new ReturnObject(topology.getTopology(), topology.getConnections(), topology.getServerPaths());
//            cache.put(queryKey, ro);
            try {
                WriteTopologies.Serialize(CACHE_FILE, cache);
            } catch (Exception e) {

            }
            return gson.toJson(ro);
        });
    }

    private static void enableCORS(final String origin, final String methods, final String headers) {

        options("/*", (request, response) -> {

            String accessControlRequestHeaders = request.headers("Access-Control-Request-Headers");
            if (accessControlRequestHeaders != null) {
                response.header("Access-Control-Allow-Headers", accessControlRequestHeaders);
            }

            String accessControlRequestMethod = request.headers("Access-Control-Request-Method");
            if (accessControlRequestMethod != null) {
                response.header("Access-Control-Allow-Methods", accessControlRequestMethod);
            }

            return "OK";
        });

        before((request, response) -> {
            response.header("Access-Control-Allow-Origin", origin);
            response.header("Access-Control-Request-Method", methods);
            response.header("Access-Control-Allow-Headers", headers);
            // Note: this may or may not be necessary in your particular application
            response.type("application/json");
        });
    }
}