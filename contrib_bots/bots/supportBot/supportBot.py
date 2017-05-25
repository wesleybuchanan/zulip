import mysql.connector
import requests
import json
import os
import sys
from os.path import expanduser
from six.moves import configparser as cp

home = expanduser('~')
CONFIG_PATH = home + '/.supportBotrc'

class supportBot(object):
    '''
    This bot will allows users to request information on a SAP support ticket by mentioning the bot
    with a ticket #.
    '''

    def __init__(self):
        self.db_info = self.get_db_info()

    def usage(self):
        return '''Allows users to requests information on a SAP support ticket.'''

    def triage_message(self, message, client):
        original_content = message['content']

        # This next line of code is defensive, as we
        # never want to get into an infinite loop of posting support ticket 
        # searches for own suport ticket searches!
        if message['sender_full_name'] == 'Support Ticket Bot':
            return False

        #print('Original Content = ' + original_content);
        #print('Message = ' + str(message));
        is_support_bot = (original_content.replace('*', '').startswith('@Support Ticket Bot') or
                          original_content.replace('*', '').startswith('@supportBot'))

        return is_support_bot

    def get_db_info(self):
        with open(CONFIG_PATH) as settings:
            config = cp.ConfigParser()
            config.readfp(settings)
            return dict(
                    ip_address=config.get('Support Database', 'ip_address'),
                    username=config.get('Support Database', 'username'),
                    password=config.get('Support Database', 'password'),
                    database_name=config.get('Support Database', 'database'))
    
    def handle_message(self, message, client, state_handler):
        original_content = message['content']
        original_sender = message['sender_email']
        ticketNumber = '';
        #print('content = ' + message['content']);
        if message['content'].find('400') == -1:
            new_content = 'I do not know how to respond to that, try sending just a ticket number!'
        else:
            i = message['content'].index('400');
            ticketNumber = message['content'][i: i + len(message['content'])]
            #print ticketNumber
            if message['type'] == 'private':
                        client.send_message(dict(
                                type='private',
                                to=message['sender_email'],
                                content='Retrieving ticket information.',
                                ))
            else:
                client.send_message(dict(
                                        type='stream',
                                        to=message['display_recipient'],
                                        subject=message['subject'],
                                        content='Retrieving ticket information.',
                                    ))
                try:
                    cnx = mysql.connector.connect(user=self.db_info['username'], password=self.db_info['password'],
                                          host=self.db_info['ip_address'],
                                          database=self.db_info['database_name'])
                    cursor = cnx.cursor(buffered=True)
                        
                    cursor.execute("SELECT notification,OwnedBy,SubjectTitle,Status FROM sapdata WHERE notification="+ticketNumber)
                except mysql.connector.Error as e:
                    new_content = 'Error trying retrieve ticket information.'

                if cursor.rowcount > 0:
                    data = cursor.fetchone()
                    payload = {'ticket_number':data[0],'created_by':data[1],'ticket_description':data[2],'status':data[3]}
                    if payload['status']=='COMP':
                        payload['status'] = 'Ticket is closed.'
                    elif payload['status']=='INPR':
                        payload['status'] = 'Ticket is in process.'
                    elif payload['status']=='REQU':
                        payload['status'] = 'Ticket is at request to customer.'
                    elif payload['status']=='SOLU':
                        payload['status'] = 'Ticket has a proposed solution.'

                    new_content = 'Ticket #**{ticket_number}**\n{ticket_description}\n{status}\nTicket currently owned by {created_by}'
                    new_content = new_content.format(**payload)
                else:
                    new_content = 'No ticket found.'        

        if message['type'] == 'private':
            client.send_message(dict(
                                    type='private',
                                    to=message['sender_email'],
                                    content=new_content,
                                ))
        else:
            client.send_message(dict(
                                    type='stream',
                                    to=message['display_recipient'],
                                    subject=message['subject'],
                                    content=new_content,
                                ))

handler_class = supportBot
