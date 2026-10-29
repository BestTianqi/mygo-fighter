package services.edge.api

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import com.comcast.ip4s.*
import fs2.io.net.SocketOption
import org.http4s.HttpApp
import org.http4s.ember.server.EmberServerBuilder
import org.http4s.implicits.*
import org.http4s.server.websocket.WebSocketBuilder2
import services.edge.objects.{EdgeConfig, EdgeConnection}
import services.edge.routes.{EdgeApiRoutes, EdgeHealthRoute, EdgeSocketRoutes}
import services.edge.utils.{InstanceClient, SocketProxy}
import services.system.routes.StaticRoutes

/** Public entry point of the split backend. It owns no room state: `/api` requests are forwarded to
  * the owning rooms instance, `/ws` is proxied, `/api/health` aggregates dependency health and
  * everything else is served from the built frontend. Route order: health, api, socket, static.
  */
object EdgeMain:
  def resource(config: EdgeConfig): Resource[IO, Unit] =
    EdgeConnection.create(config).flatMap { connection =>
      val client = InstanceClient.create(connection)
      val sockets = SocketProxy.create(connection.httpClient, config.wsQueueFrames)
      for
        _ <- Resource.eval(IO.println(startupLine(config)))
        _ <- server(connection, client, sockets, config)
      yield ()
    }

  private def server(
      connection: EdgeConnection,
      client: InstanceClient,
      sockets: SocketProxy,
      config: EdgeConfig
  ): Resource[IO, Unit] =
    EmberServerBuilder
      .default[IO]
      .withHost(Host.fromString(config.host).getOrElse(host"127.0.0.1"))
      .withPort(Port.fromInt(config.port).getOrElse(port"8080"))
      .withAdditionalSocketOptions(List(SocketOption.noDelay(true)))
      .withHttpWebSocketApp(builder => app(connection, client, sockets, builder, config))
      .build
      .map(_ => ())

  private def app(
      connection: EdgeConnection,
      client: InstanceClient,
      sockets: SocketProxy,
      builder: WebSocketBuilder2[IO],
      config: EdgeConfig
  ): HttpApp[IO] =
    val routes =
      EdgeHealthRoute.routes(client) <+>
        EdgeApiRoutes.routes(connection, client) <+>
        EdgeSocketRoutes.routes(connection, client, sockets, builder) <+>
        StaticRoutes.routes(config.webRoot)
    connection.admission.wrap(routes.orNotFound)

  private def startupLine(config: EdgeConfig): String =
    val lobby = config.lobbyUrl.fold("no lobby")(url => s"lobby $url")
    val rooms = config.roomsDirectUrl.fold("")(url => s", direct $url")
    s"Edge: http://${config.host}:${config.port} ($lobby$rooms, web ${config.webRoot})"
