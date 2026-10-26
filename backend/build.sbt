ThisBuild / scalaVersion := "3.3.6"
ThisBuild / organization := "mygo"
ThisBuild / version := "2.0.0"

lazy val root = (project in file("."))
  .enablePlugins(JavaAppPackaging)
  .settings(
    name := "mygo-server",
    maintainer := "mygo-fighter contributors",
    Compile / mainClass := Some("services.system.api.Main"),
    // The server distribution needs runtime jars, not a published Scaladoc jar.
    // Keep `doc` available as an explicit task without running it during packaging.
    Compile / packageDoc / publishArtifact := false,
    Compile / doc / scalacOptions --= Seq("-Werror"),
    Universal / mappings ++= {
      val web = baseDirectory.value / ".." / "frontend" / "dist"
      (web ** "*").get.filter(_.isFile).map(file => file -> ("web/" + IO.relativize(web, file).get))
    },
    scalacOptions ++= Seq("-Wunused:imports", "-Werror"),
    Compile / run / fork := true,
    Compile / run / javaOptions ++= Seq("-Xms256m", "-Xmx2g", "-Dpolyglot.engine.WarnInterpreterOnly=false"),
    libraryDependencies ++= Seq(
      "org.typelevel" %% "cats-effect" % "3.6.3",
      "org.http4s" %% "http4s-ember-server" % "0.23.32",
      "org.http4s" %% "http4s-dsl" % "0.23.32",
      "org.http4s" %% "http4s-circe" % "0.23.32",
      "io.circe" %% "circe-generic" % "0.14.15",
      "io.circe" %% "circe-parser" % "0.14.15",
      "org.graalvm.polyglot" % "polyglot" % "24.2.2",
      "org.graalvm.polyglot" % "js-community" % "24.2.2" pomOnly(),
      "ch.qos.logback" % "logback-classic" % "1.5.20"
    )
  )
