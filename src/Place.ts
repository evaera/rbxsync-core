import path = require('path')
import express = require('express')

import Util from './Util'

enum CommandAction { Open }
enum CommandStatus { Ok, Conflict, Timeout }

interface Command {
  status: CommandStatus,
  action: CommandAction
}

export default class Place {
  public static readonly instances = new Map<string, Place>()

  public id: string
  private response: express.Response | null
  private commands: CommandAction[]
  private timeoutIndex: NodeJS.Timer | null = null

  constructor () {
    this.id = Util.generateRandomString(30)
    this.response = null
    this.commands = []

    Place.instances.set(this.id, this)
  }

  public static getPlace (id: string): Place {
    if (Place.instances.has(id)) {
      return Place.instances.get(id) as Place
    }

    throw new Error('Unknown place id!')
  }

  public setResponse (res: express.Response): void {
    if (this.response !== null) {
      this.send(CommandStatus.Conflict)
    }

    this.response = res

    if (this.commands.length > 0) {
      this.sendFirstCommand()
    } else {
      const currentResponse = this.response

      this.timeoutIndex = setTimeout(() => {
        if (currentResponse === this.response) {
          this.send(CommandStatus.Timeout)
        }
      }, 55000)
    }
  }

  private send (status: CommandStatus, data = {}): void {
    if (this.response == null) {
      throw new Error('Attempt to send message to place instance when response was null')
    }

    this.response.json({ status: CommandStatus[status], ...data }).end()
    this.response = null

    if (this.timeoutIndex != null) {
      clearTimeout(this.timeoutIndex)
      this.timeoutIndex = null
    }
  }

  private sendFirstCommand (): void {
    if (this.commands.length === 0 || this.response == null) {
      return
    }

    this.send(CommandStatus.Ok, this.commands.shift())
  }
}
