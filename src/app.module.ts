import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SignalGateway } from "src/events/signal.gateway";

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService, SignalGateway],
})
export class AppModule {}