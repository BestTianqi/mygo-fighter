package services.system.routes

import cats.effect.IO
import io.circe.Json
import scala.reflect.ClassTag
import services.system.objects.Connection

final case class APIRegistration(name: String, run: (Json, Connection) => IO[Json])

object APIRegistration:
  def named[M: ClassTag](run: (Json, Connection) => IO[Json]): APIRegistration =
    val name = summon[ClassTag[M]].runtimeClass.getSimpleName
      .stripSuffix("Message")
      .toLowerCase(java.util.Locale.ROOT)
    APIRegistration(name, run)
