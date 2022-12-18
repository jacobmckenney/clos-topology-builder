FROM openjdk:11
COPY . /app
WORKDIR /app
RUN curl -O https://dlcdn.apache.org/maven/maven-3/3.8.6/binaries/apache-maven-3.8.6-bin.zip
RUN unzip apache-maven-3.8.6-bin.zip
ENV PATH="${PATH}:/app/apache-maven-3.8.6/bin"
RUN mvn clean package
EXPOSE 4567
CMD java -jar target/clos-backend-1.0-SNAPSHOT-jar-with-dependencies.jar
