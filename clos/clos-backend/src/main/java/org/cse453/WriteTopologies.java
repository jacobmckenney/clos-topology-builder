package org.cse453;

import java.io.*;
import java.util.*;

import org.cse453.ClosTopology.ReturnObject;

public class WriteTopologies {
    public static void main(String[] args) {
        System.out.println("Writing!");
    }

    public static void Serialize(String fileName, Map<String, ReturnObject> o) throws IOException {
        FileOutputStream fos = new FileOutputStream(fileName);
        ObjectOutputStream oos = new ObjectOutputStream(fos);
        oos.writeObject(o);
    }

    public static Map<String, ReturnObject> Deserialize(String fileName) throws IOException, ClassNotFoundException {
        FileInputStream fis = new FileInputStream(fileName);
        ObjectInputStream ois = new ObjectInputStream(fis);
        return (Map<String, ReturnObject>) ois.readObject();
    }
}
