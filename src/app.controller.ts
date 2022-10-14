import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AppService } from "./app.service";

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    async homeTest(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        return res.json({ test: 1 });
    }
}
