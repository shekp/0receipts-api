const http = require('http');

import { app } from './express'
import express from 'express';

import log from '../config/logger';
import { webSevPort } from '../config/web-server';


let httpServer: any;

export function init(): Promise<express.Application> {
    return new Promise( (resolve, reject) => {
        httpServer = http.createServer(app);

        httpServer
            .listen(webSevPort.port)
            .on('listening', () => {
                log.info(`Web server listening on localhost:${webSevPort.port}`);
                resolve(app);
            })
            .on('error', (error: any) => {
                reject(error)
            });

    });
}


export function close(): Promise<undefined | any> {
    return new Promise<undefined | any>((resolve: Function, reject: Function) => {
        httpServer
            .close(function(error: any) {
                if(error) {
                    reject(error);
                    return;
                }
                resolve();
            })
    })
}

